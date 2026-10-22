const resolveOutputPath = (outputPath: string, manifestPath?: string): string => {
  if (manifestPath) {
    const postRoot = buildPostRoot(manifestPath);
    return buildOutputPath(postRoot, outputPath);
  }

  return outputPath;
};
