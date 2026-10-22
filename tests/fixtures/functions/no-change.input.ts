const run = () => {
  setValue(next);

  syncStore(next);

  const ready = true;

  if (ready) {
    work();
  }
};
