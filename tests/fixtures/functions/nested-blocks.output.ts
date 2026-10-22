const run = () => {
  const job = findJob();

  if (!job) {
    return;
  }

  if (!job.ready) {
    return;
  }

  const execution = createExecution();

  const payload = loadPayload();

  for (const item of payload.items) {
    const image = readImage(item);

    if (!image) {
      continue;
    }

    saveImage(image);

    logSaved(image);
  }

  try {
    markStarted();

    updateState();
  } catch (error) {
    reportError(error);

    throw error;
  }

  execution.release();
};
