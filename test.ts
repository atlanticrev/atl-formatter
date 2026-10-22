import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { RuntimeContext } from '../../app/runtime-context.js';
import {
    buildRenderWorkflow,
    downloadImage,
    extractImages,
    loadComfyUiConfig,
    loadWorkflowTemplate,
    pollHistory,
    queuePrompt,
} from '../../adapters/comfyui/comfyui-client.js';
import { createArtifact, listArtifactsForJob } from '../../pipeline/artifacts/artifact-store.js';
import { appendRuntimeEvent } from '../../pipeline/events/event-store.js';
import { findJobById, updateJobStatus } from '../../pipeline/jobs/job-store.js';
import { syncPipelineRunFromSteps } from '../../pipeline/runs/pipeline-run-lifecycle.js';
import type { ArtifactRow, JobRow, PipelineRunRow, StepRunRow } from '../../pipeline/schemas/runtime-schemas.js';
import { updateStepRunProgress } from '../../pipeline/steps/step-run-store.js';
import { projectRenderResultsToManifest } from '../../projections/manifests/render-manifest-projection.js';
import { createWorkerExecutionContext } from '../worker-control.js';
import { renderJobPayloadSchema } from './render-contracts.js';

export type RenderWorkerResult = Readonly<{
    job: JobRow;
    step: StepRunRow;
    run: PipelineRunRow;
    artifacts: ArtifactRow[];
}>;

export function calculateRenderStepProgress(totalSlides: number, completedSlides: number): number {
    if (totalSlides <= 0) {
        return 10;
    }

    if (completedSlides >= totalSlides) {
        return 100;
    }

    return Math.max(10, Math.min(99, Math.round(10 + (completedSlides / totalSlides) * 90)));
}

function resolveOutputPath(outputPath: string, outputRoot: string, manifestPath?: string): string {
    if (path.isAbsolute(outputPath)) {
        return outputPath;
    }

    if (manifestPath) {
        const postRoot = path.dirname(path.dirname(resolveManifestPath(manifestPath)));
        return path.resolve(postRoot, outputPath);
    }

    return path.resolve(process.cwd(), outputRoot, outputPath);
}

function resolveManifestPath(manifestPath: string): string {
    if (path.isAbsolute(manifestPath)) {
        return manifestPath;
    }

    return path.resolve(process.cwd(), manifestPath);
}

export async function runRenderWorkerOnce(
    runtimeContext: RuntimeContext,
    jobId: string,
    workerId?: string,
    leaseTtlMs?: number,
): Promise<RenderWorkerResult> {
    const job = findJobById(runtimeContext.database, jobId);

    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    if (job.jobType !== 'render_post') {
        throw new Error(`Job ${jobId} is not a render_post job`);
    }

    const execution = createWorkerExecutionContext(runtimeContext, job, 'render', workerId, leaseTtlMs);

    const payload = renderJobPayloadSchema.parse(JSON.parse(job.payloadJson));

    const comfyUiConfig = await loadComfyUiConfig(runtimeContext.config);

    const workflowTemplate = await loadWorkflowTemplate(comfyUiConfig);

    execution.log('info', 'Render worker started');

    updateJobStatus(runtimeContext.database, jobId, 'running');

    if (job.stepRunId) {
        updateStepRunProgress(runtimeContext.database, {
            pipelineRunId: job.pipelineRunId,
            stepRunId: job.stepRunId,
            status: 'running',
            progressPercent: calculateRenderStepProgress(payload.slides.length, 0),
            context: {
                completedSlides: 0,
                totalSlides: payload.slides.length,
            },
        });

        syncPipelineRunFromSteps(runtimeContext.database, job.pipelineRunId);
    }

    const slideResults: Array<{
        slideIndex: number;
        outputPath: string;
        promptId: string;
        seed: number;
    }> = [];

    try {
        for (const slide of payload.slides) {
            appendRuntimeEvent(runtimeContext.database, {
                pipelineRunId: job.pipelineRunId,
                stepRunId: job.stepRunId,
                jobId: job.id,
                eventType: 'render.slide.started',
                eventPayload: {
                    slideIndex: slide.slideIndex,
                    completedSlides: slideResults.length,
                    totalSlides: payload.slides.length,
                },
            });

            execution.log('info', 'Render slide started', {
                slideIndex: slide.slideIndex,
                completedSlides: slideResults.length,
                totalSlides: payload.slides.length,
            });

            execution.heartbeat();

            const { workflow, seed, filenamePrefix } = buildRenderWorkflow(
                workflowTemplate,
                comfyUiConfig,
                slide,
                jobId,
            );

            const promptId = await queuePrompt(comfyUiConfig.server_url, workflow);

            const history = await pollHistory(
                comfyUiConfig.server_url,
                promptId,
                comfyUiConfig.timeout_sec,
                comfyUiConfig.poll_interval_sec,
                () => execution.heartbeat(),
            );

            const image = extractImages(history)[0];

            if (!image) {
                throw new Error(`ComfyUI returned no downloadable image for job ${jobId} slide ${slide.slideIndex}`);
            }

            const bytes = await downloadImage(comfyUiConfig.server_url, image);

            const outputPath = resolveOutputPath(
                slide.outputPath,
                runtimeContext.config.RENDER_OUTPUT_ROOT,
                payload.manifestPath,
            );

            await mkdir(path.dirname(outputPath), {
                recursive: true,
            });

            await writeFile(outputPath, bytes);

            createArtifact(runtimeContext.database, {
                pipelineRunId: job.pipelineRunId,
                jobId: job.id,
                artifactKind: 'rendered_image',
                path: outputPath,
                metadata: {
                    slideIndex: slide.slideIndex,
                    promptId,
                    seed,
                    filenamePrefix,
                    sourceFilename: image.filename,
                    nodeId: image.node_id,
                },
            });

            appendRuntimeEvent(runtimeContext.database, {
                pipelineRunId: job.pipelineRunId,
                stepRunId: job.stepRunId,
                jobId: job.id,
                eventType: 'render.slide.completed',
                eventPayload: {
                    slideIndex: slide.slideIndex,
                    outputPath,
                    promptId,
                    seed,
                },
            });

            slideResults.push({
                slideIndex: slide.slideIndex,
                outputPath,
                promptId,
                seed,
            });

            if (job.stepRunId) {
                updateStepRunProgress(runtimeContext.database, {
                    pipelineRunId: job.pipelineRunId,
                    stepRunId: job.stepRunId,
                    status: 'running',
                    progressPercent: calculateRenderStepProgress(payload.slides.length, slideResults.length),
                    context: {
                        completedSlides: slideResults.length,
                        totalSlides: payload.slides.length,
                        slideIndex: slide.slideIndex,
                    },
                });

                syncPipelineRunFromSteps(runtimeContext.database, job.pipelineRunId);
            }

            execution.log('info', 'Render slide completed', {
                slideIndex: slide.slideIndex,
                outputPath,
                promptId,
            });
        }

        if (payload.manifestPath) {
            const projectedManifestPath = await projectRenderResultsToManifest(
                resolveManifestPath(payload.manifestPath),
                slideResults,
            );

            createArtifact(runtimeContext.database, {
                pipelineRunId: job.pipelineRunId,
                jobId: job.id,
                artifactKind: 'manifest_projection',
                path: projectedManifestPath,
                metadata: {
                    slideCount: slideResults.length,
                },
            });

            appendRuntimeEvent(runtimeContext.database, {
                pipelineRunId: job.pipelineRunId,
                stepRunId: job.stepRunId,
                jobId: job.id,
                eventType: 'render.manifest.updated',
                eventPayload: {
                    manifestPath: projectedManifestPath,
                    slideCount: slideResults.length,
                },
            });
        }

        const finished = updateJobStatus(runtimeContext.database, jobId, 'succeeded');

        execution.log('info', 'Render worker finished successfully', {
            artifactCount: listArtifactsForJob(runtimeContext.database, jobId).length,
        });

        execution.release();

        return {
            ...finished,
            artifacts: listArtifactsForJob(runtimeContext.database, jobId),
        };
    } catch (error) {
        appendRuntimeEvent(runtimeContext.database, {
            pipelineRunId: job.pipelineRunId,
            stepRunId: job.stepRunId,
            jobId: job.id,
            eventType: 'render.job.failed',
            eventPayload: {
                message: error instanceof Error ? error.message : 'Unknown render error',
            },
        });

        execution.log('error', 'Render worker failed', {
            message: error instanceof Error ? error.message : 'Unknown render error',
        });

        updateJobStatus(runtimeContext.database, jobId, 'retryable_failed', {
            errorMessage: error instanceof Error ? error.message : 'Unknown render error',
        });

        execution.release();

        throw error;
    }
}
