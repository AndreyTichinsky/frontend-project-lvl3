const parser = (html) => {
  const title = html.querySelector("title").textContent;
  const description = html.querySelector("description").textContent;
  const itemsArr = Array.from(html.querySelectorAll("item"));
  const items = {};
  itemsArr.forEach((item) => {
    const pubDate = item.querySelector('pubDate').textContent;
    const formattedDate = Date.parse(pubDate);
    items[formattedDate] = {
      title: item.querySelector('title').textContent,
      description: item.querySelector('description').textContent,
      link: item.querySelector('link').textContent,
    };
  });
  return {
    title,
    description,
    items
  }
};

export default parser;