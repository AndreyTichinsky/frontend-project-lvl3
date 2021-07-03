const parser = (html) => {
  const title = html.querySelector("title").textContent;
  const description = html.querySelector("description").textContent;
  const mainLink = html.querySelector("link").textContent;
  const itemsArr = Array.from(html.querySelectorAll("item"));
  const items = {};
  const domain = new URL(mainLink);
  const nameForHash = domain.hostname.replace("www.", "");
  itemsArr.forEach((item) => {
    const pubDate = item.querySelector('pubDate').textContent;
    const formattedDate = Date.parse(pubDate);
    const link = item.querySelector('link').textContent;
    const hash = nameForHash + formattedDate;
    items[hash] = {
      title: item.querySelector('title').textContent,
      description: item.querySelector('description').textContent,
      link,
      hash
    };
  });
  return {
    title,
    description,
    items
  }
};

export default parser;