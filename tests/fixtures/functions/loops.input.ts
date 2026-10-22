const run = () => {
  const items = [1, 2, 3];
  for (const item of items) {
    log(item);
  }

  let index = 0;
  while (index < items.length) {
    index += 1;
  }

  const pairs = items.entries();
  for (const pair in Object.fromEntries(pairs)) {
    log(pair);
  }

  const done = false;
  do {
    work();
  } while (done);
};
