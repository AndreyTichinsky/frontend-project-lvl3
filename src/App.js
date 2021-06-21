import axios from "axios";
import * as yup from 'yup';
import parser from "./utils/parser";

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
    const listHtml = feedInfo.reduce((acc, cur) => {
      acc = acc + cur.items.reduce((subAcc, { link, title, description }) => {
        subAcc = subAcc + `<li
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
        </li>`
        return subAcc;
      }, "");
      return acc;
    }, "");
    return `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0">
        ${listHtml}
      </ul>
    </div>`;
  };

  const render = (state) => {
    console.log("RENDER!");
    searchInput.classList.toggle("is-invalid", state.error !== null);
    invalidFeedback.textContent = state.error;
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
            console.log(domParser.parseFromString(res.data.contents, "application/xml"));
            const html = domParser.parseFromString(res.data.contents, "application/xml");
            state.feedInfo.push(parser(html));
            state.feeds.push(value);
            repeatFeedSchema = yup.mixed().notOneOf(state.feeds);
            render(state);
          }).catch((err) => {
            console.error(err);
            state.error = "Что-то пошло не так, попробуйте повторить позже";
            render(state);
          });
      } else {
        const [ rssExist, invalidUrl ] = results;
        if (!rssExist) {
          state.error = "RSS уже существует";
        } else if (!invalidUrl) {
          state.error = "Ссылка должна быть валидным URL"
        }
        render(state);
      }
    });
  });
};

export default App;