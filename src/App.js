import axios from "axios";
import * as yup from 'yup';
import parser from "./utils/parser";
import i18next from 'i18next';
import View from "./View"
import $ from "jquery";
import sanitizeHtml from 'sanitize-html';

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
    searchInputValue: "",
    feeds: [],
    feedInfo: [],
    postsSequence: [],
    postsMap: {},
    error: null,
    pressedPosts: {}
  };
  const domParser = new DOMParser();
  const form = document.querySelector(".rss-form");
  const searchInput = form.querySelector("#url-input");
  const invalidFeedback = document.querySelector(".feedback");
  const feeds = document.querySelector(".feeds");
  const posts = document.querySelector(".posts");
  const modal = document.querySelector(".modal");
  const modalData = {
    link: modal.querySelector(".full-article"),
    title: modal.querySelector(".modal-title"),
    body: modal.querySelector(".modal-body"),
  };

  $('#modal').on('show.bs.modal', function (event) {
    const button = $(event.relatedTarget);
    const buttonData = {
      title: button.data('modal-title'),
      link: button.data('modal-link'),
      description: button.data('modal-description'),
      hash: button.data('modal-hash'),
    };
    modalData.link.href = buttonData.link;
    modalData.title.textContent = buttonData.title;
    modalData.body.textContent = buttonData.description;
  });
  
  $(".posts").on("click", (event) => {
    const originalEvent = event.originalEvent;
    const liHash = originalEvent.path.reduce((acc, node) => {
      if (acc === null) {
        const hash = $(node).data("hash");
        if (hash) {
          return hash;
        }
      }
      return acc;
    }, null);
    state.pressedPosts[liHash] = true;
    render(state);
  });

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
    feeds.innerHTML = `<div class="card border-0">
      <div class="card-body">
        <h2 class="card-title h4">Фиды</h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${listHtml}
      </ul>
    </div>`;
  };
  const renderPosts = (postsSequence) => {
    const listHtml = postsSequence.reduceRight((acc, hash) => {
        return acc + renderLi(state.postsMap[hash]);
      }, "");
    posts.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0 posts-list">
        ${listHtml}
      </ul>
    </div>`;
  };

  const renderLi = ({ link, title, description, hash }) => {
    const sanitizedLink = sanitizeHtml(link);
    return `<li
        data-hash="${hash}"
        class="list-group-item d-flex justify-content-between align-items-start border-0 border-end-0"
      >
        <a
          href="${sanitizedLink}"
          class="${state.pressedPosts[hash] ? "fw-normal" : "fw-bold"}"
          data-id="2"
          target="_blank"
          rel="noopener noreferrer"
          data-external-link=
          data-modal-hash='${hash}'
          >${title}</a
        ><button
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-id="2"
          data-toggle="modal"
          data-target="#modal"
          data-modal-link='${sanitizedLink}'
          data-modal-title="${sanitizeHtml(title)}"
          data-modal-description='${sanitizeHtml(description, { allowedTags: []})}'
          data-modal-hash='${hash}'
        >
          Просмотр
        </button>
      </li>`;
  }
  
  const render = (state) => {
    searchInput.classList.toggle("is-invalid", state.error !== null);
    invalidFeedback.textContent = i18next.t(state.error);
    renderFeeds(state.feedInfo);
    renderPosts(state.postsSequence);
    if (state.error === null) {
      searchInput.value = state.searchInputValue;
    }
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
            const html = domParser.parseFromString(res.data.contents, "application/xml");
            const { title, description, items } = parser(html);
            const arrayOfHashes = Object.keys(items);
            state.feedInfo.push({ title, description });
            state.postsSequence = state.postsSequence.concat(arrayOfHashes);
            state.postsMap = { ...state.postsMap, ...items };
            state.feeds.push(value);
            repeatFeedSchema = yup.mixed().notOneOf(state.feeds);
            render(state);
            View({ feed: value, feedObj: items, renderPosts, state });
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