import axios from "axios";
import * as yup from 'yup';
import parser from "./utils/parser";
import i18next from 'i18next';
import View from "./View"

i18next.init({
  lng: 'ru', // if you're using a language detector, do not define the lng option
  debug: true,
  resources: {
    ru: {
      translation: {
        "something_went_wrong": "Что-то пошло не так, попробуйте повторить позже",
        "rss_already_exist": "RSS уже существует",
        "invalid_url": "Ссылка должна быть валидным URL"
      }
    }
  }
});

const App = () => {
  const state = {
    feeds: [],
    feedInfo: [],
    error: null
  };
  const domParser = new DOMParser();
  const form = document.querySelector(".rss-form");
  const searchInput = form.querySelector("#url-input");
  const invalidFeedback = document.querySelector(".feedback");
  const feeds = document.querySelector(".feeds");
  const posts = document.querySelector(".posts");

  const renderFeeds = (feedInfo) => {
    const listHtml = feedInfo.reduce((acc, cur) => {
      acc += `<li class="list-group-item border-0 border-end-0">
        <h3 class="h6 m-0">${cur.title}</h3>
        <p class="m-0 small text-black-50">
          ${cur.description}
        </p>
      </li>`
      return acc;
    }, "");
    return `<div class="card border-0">
      <div class="card-body">
        <h2 class="card-title h4">Фиды</h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${listHtml}
      </ul>
    </div>`;
  };
  const renderPosts = (feedInfo) => {
    console.log(feedInfo);
    const listHtml = feedInfo.reduce((acc, cur) => {
      acc = acc + Object.keys(cur.items).reduce((subAcc, id) => {
        return subAcc + renderLi(cur.items[id]);
      }, "");
      return acc;
    }, "");
    return `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0 posts-list">
        ${listHtml}
      </ul>
    </div>`;
  };

  const renderNewPosts = (newPosts) => {
    console.log(newPosts);
    const postsList = posts.querySelector('.posts-list');
    const newPostsHtml = Object.keys(newPosts).sort((a,b)=>b-a).reduce((acc, id) => {
      return acc + renderLi(newPosts[id]);
    }, '');
    postsList.innerHTML = newPostsHtml + postsList.innerHTML;
  }

  const renderLi = ({link, title}) => {
    return `<li
        class="list-group-item d-flex justify-content-between align-items-start border-0 border-end-0"
      >
        <a
          href="${link}"
          class="fw-bold"
          data-id="2"
          target="_blank"
          rel="noopener noreferrer"
          >${title}</a
        ><button
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-id="2"
          data-bs-toggle="modal"
          data-bs-target="#modal"
        >
          Просмотр
        </button>
      </li>`;
  }
  
  const render = (state) => {
    console.log("RENDER!");
    searchInput.classList.toggle("is-invalid", state.error !== null);
    invalidFeedback.textContent = i18next.t(state.error);
    feeds.innerHTML = renderFeeds(state.feedInfo);
    posts.innerHTML = renderPosts(state.feedInfo);
  };

  let repeatFeedSchema = yup.mixed().notOneOf(state.feeds);
  const correctUrlSchema = yup.string().url();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = searchInput.value;
    Promise.all([
      repeatFeedSchema.isValid(value),
      correctUrlSchema.isValid(value)
    ]).then((results) => {
      if (results.every(Boolean)) {
        axios.get(`https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(value)}`)
          .then((res) => {
            console.log(res);
            const html = domParser.parseFromString(res.data.contents, "application/xml");
            console.log(html);
            const feedObj = parser(html);
            state.feedInfo.push(feedObj);
            state.feeds.push(value);
            repeatFeedSchema = yup.mixed().notOneOf(state.feeds);
            render(state);
            View(value, feedObj, renderNewPosts);
          }).catch((err) => {
            console.error(err);
            state.error = "invalid_url";
            render(state);
          });
      } else {
        const [ rssExist, invalidUrl ] = results;
        if (!rssExist) {
          state.error = "rss_already_exist";
        } else if (!invalidUrl) {
          state.error = "invalid_url"
        }
        render(state);
      }
    });
  });
};

export default App;