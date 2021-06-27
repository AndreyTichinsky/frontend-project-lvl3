import axios from "axios";
import parser from "../utils/parser";

const View = (feed, feedObj, renderNewPosts) => {
  const domParser = new DOMParser();
  const timer = () => {
    setTimeout(() => {
      axios.get(`https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(feed)}`)
        .then((res) => {
          const html = domParser.parseFromString(res.data.contents, "application/xml");
          console.log(parser(html));
          const parsedHtml = parser(html);
          const diff = Object.keys(parsedHtml.items).reduce((acc, id) => {
            if (feedObj.items[id] === undefined) {
              acc[id] = parsedHtml.items[id];
            }
            return acc;
          }, {});
          feedObj.items = { ...feedObj.items, ...diff };
          renderNewPosts(diff);
          timer();
        }).catch((err) => {
          console.error(err);
          timer();
        });
    }, 5000)
  };
  timer();
};
export default View;