const view = (
  <div>
    <Header />
    {isOpen && <Panel />}
    {items.map((item) => <Row key={item.id} />)}
    {footer}
    {renderActions?.(actions)}
  </div>
);
