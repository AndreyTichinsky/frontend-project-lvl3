import axios from 'axios';
import parser from '../utils/parser';

const View = (props) => {
  const { feed, renderPosts, state } = props;
  const domParser = new DOMParser();
  const timer = () => {
    setTimeout(() => {
      axios
        .get(
          `https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(
            feed,
          )}`,
        )
        .then((res) => {
          const html = domParser.parseFromString(
            res.data.contents,
            'application/xml',
          );
          const parsedHtml = parser(html);
          console.log(parsedHtml);
          const diffHashArr = [];
          const diff = Object.keys(parsedHtml.items).reduce((acc, hash) => {
            if (state.postsMap[hash] === undefined) {
              const item = parsedHtml.items[hash];
              acc[hash] = item;
              diffHashArr.push(item.hash);
            }
            return acc;
          }, {});
          state.postsSequence = state.postsSequence.concat(
            diffHashArr.reverse(),
          );
          state.postsMap = { ...state.postsMap, ...diff };
          renderPosts(state.postsSequence);
          timer();
        })
        .catch((err) => {
          console.error(err);
          timer();
        });
    }, 5000);
  };
  timer();
};
export default View;
