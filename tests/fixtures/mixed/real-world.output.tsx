type Props = {
  title: string;
};

export const Screen = ({ title }: Props) => {
  const ready = true;

  if (!ready) {
    return null;
  }

  setState(title);

  renderSomething(
    title,
    ready,
  );

  return (
    <main>
      <Header />

      {title}

      {/* hint */}

      {ready && <Panel />}

      <>
        <ActionBar />

        <Footer />
      </>
    </main>
  );
};
