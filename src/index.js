import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from "axios";
import * as yup from 'yup';
import parser from "./utils/parser";
import i18next from 'i18next';
import View from "./View"
import $ from "jquery";
import sanitizeHtml from 'sanitize-html';

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru: {
      translation: {
        "rss_already_exist": "RSS уже существует",
        "invalid_url": "Ссылка должна быть валидным URL",
        "success_load_rss": "RSS успешно загружен",
        "empty_request": "Не должно быть пустым",
        "must_be_valid_rss": "Ресурс не содержит валидный RSS",
        "check": "Просмотр",
        "network_error": "Ошибка сети"
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
    status: null,
    pressedPosts: {}
  };
  const domParser = new DOMParser();
  const form = document.querySelector(".rss-form");
  const searchInput = document.querySelector("#url-input");
  const invalidFeedback = document.querySelector(".feedback");
  const feeds = document.querySelector(".feeds");
  const posts = document.querySelector(".posts");
  // const modal = document.querySelector(".modal");
  const modalData = {
    link: document.querySelector(".full-article"),
    title: document.querySelector(".modal-title"),
    body: document.querySelector(".modal-body"),
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
          ${i18next.t("check")}
        </button>
      </li>`;
  }
  
  const render = (state) => {
    const success = state.status !== null && state.status !== "success_load_rss";
    searchInput.classList.toggle("is-invalid", success);
    invalidFeedback.textContent = i18next.t(state.status);
    invalidFeedback.classList.toggle("text-success", state.status === "success_load_rss");
    if (state.status !== "must_be_valid_rss") {
      renderFeeds(state.feedInfo);
      renderPosts(state.postsSequence);
    }
    searchInput.value = state.searchInputValue;
  };

  let repeatFeedSchema = yup.mixed().notOneOf(state.feeds);
  const correctUrlSchema = yup.string().url();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = searchInput.value;
    state.searchInputValue = value;
    Promise.all([
      repeatFeedSchema.isValid(value),
      correctUrlSchema.isValid(value)
    ]).then((results) => {
      if (results.every(Boolean)) {
        searchInput.setAttribute("readonly", true);
        axios.get(`https://hexlet-allorigins.herokuapp.com/get?disableCache=true&url=${encodeURIComponent(value)}`)
          .then((res) => {
            try {
              const html = domParser.parseFromString(res.data.contents, "application/xml");
              const { title, description, items } = parser(html);
              const arrayOfHashes = Object.keys(items);
              state.feedInfo.push({ title, description });
              state.postsSequence = state.postsSequence.concat(arrayOfHashes);
              state.postsMap = { ...state.postsMap, ...items };
              state.feeds.push(value);
              repeatFeedSchema = yup.mixed().notOneOf(state.feeds);
              state.searchInputValue = "";
              state.status = "success_load_rss";
              View({ feed: value, renderPosts, state });
            } catch (err) {
              console.error(err);
              state.status = "must_be_valid_rss";
            }
          }).catch((err) => {
            console.error(err);
            state.status = "network_error";
            state.searchInputValue = "";
          }).finally(() => {
            searchInput.removeAttribute("readonly");
            render(state);
          });
      } else {
        const [ rssExist, invalidUrl ] = results;
        if (!rssExist) {
          state.status = "rss_already_exist";
        } else if (!invalidUrl) {
          state.status = "invalid_url"
          state.searchInputValue = "";
        }
        render(state);
      }
    });
  });
};

export default App;