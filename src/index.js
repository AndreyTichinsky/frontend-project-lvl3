import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import * as yup from 'yup';
import i18next from 'i18next';
import $ from 'jquery';
import sanitizeHtml from 'sanitize-html';
import View from './View';
import parser from './utils/parser';

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru: {
      translation: {
        rss_already_exist: 'RSS уже существует',
        invalid_url: 'Ссылка должна быть валидным URL',
        success_load_rss: 'RSS успешно загружен',
        empty_request: 'Не должно быть пустым',
        must_be_valid_rss: 'Ресурс не содержит валидный RSS',
        check: 'Просмотр',
        network_error: 'Ошибка сети',
      },
    },
  },
});

const App = () => {
  const state = {
    searchInputValue: '',
    feeds: [],
    feedInfo: [],
    postsSequence: [],
    postsMap: {},
    status: null,
    pressedPosts: {},
  };
  const domParser = new DOMParser();
  const form = document.querySelector('.rss-form');
  const searchButton = form.querySelector('button');
  const searchInput = form.querySelector('#url-input');
  const invalidFeedback = document.querySelector('.feedback');
  const feeds = document.querySelector('.feeds');
  const posts = document.querySelector('.posts');
  const modal = document.querySelector('.modal');
  const modalData = {
    link: modal.querySelector('.full-article'),
    title: modal.querySelector('.modal-title'),
    body: modal.querySelector('.modal-body'),
  };

  const renderFeeds = (feedInfo) => {
    const listHtml = feedInfo.reduce((acc, cur) => {
      const newAcc = `${acc}<li class="list-group-item border-0 border-end-0">
        <h3 class="h6 m-0">${cur.title}</h3>
        <p class="m-0 small text-black-50">
          ${cur.description}
        </p>
      </li>`;
      return newAcc;
    }, '');
    feeds.innerHTML = `<div class="card border-0">
      <div class="card-body">
        <h2 class="card-title h4">Фиды</h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${listHtml}
      </ul>
    </div>`;
  };

  const renderLi = ({
    link, title, description, hash,
  }) => {
    const sanitizedLink = sanitizeHtml(link);
    return `<li
        data-hash="${hash}"
        class="post list-group-item d-flex justify-content-between align-items-start border-0 border-end-0"
      >
        <a
          href="${sanitizedLink}"
          class="${state.pressedPosts[hash] ? 'fw-normal' : 'fw-bold'}"
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
          data-modal-description='${sanitizeHtml(description, { allowedTags: [] })}'
          data-modal-hash='${hash}'
        >
          ${i18next.t('check')}
        </button>
      </li>`;
  };

  const renderPosts = (postsSequence) => {
    const listHtml = postsSequence.reduceRight(
      (acc, hash) => acc + renderLi(state.postsMap[hash]),
      '',
    );
    posts.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0 posts-list">
        ${listHtml}
      </ul>
    </div>`;
  };

  const render = () => {
    const success = state.status !== null && state.status !== 'success_load_rss';
    searchInput.classList.toggle('is-invalid', success);
    invalidFeedback.textContent = i18next.t(state.status);
    invalidFeedback.classList.toggle(
      'text-success',
      state.status === 'success_load_rss',
    );
    if (state.status !== 'must_be_valid_rss') {
      renderFeeds(state.feedInfo);
      renderPosts(state.postsSequence);
    }
    searchInput.value = state.searchInputValue;
  };

  $('#modal').on('show.bs.modal', (event) => {
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

  posts.addEventListener('click', (event) => {
    let { target } = event;
    while (target.nodeName !== 'LI') {
      target = target.parentElement;
    }
    const liHash = $(target).data('hash');
    if ($(target).data('hash')) {
      state.pressedPosts[liHash] = true;
      render(state);
    }
  });

  const schemas = {
    repeatFeed: yup.mixed().notOneOf(state.feeds),
    correctUrl: yup.string().url(),
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    searchButton.disabled = true;
    const { value } = searchInput;
    state.searchInputValue = value;
    Promise.all([
      schemas.repeatFeed.isValid(value),
      schemas.correctUrl.isValid(value),
    ]).then((results) => {
      if (results.every(Boolean)) {
        searchInput.setAttribute('readonly', true);
        axios
          .get(
            `https://hexlet-allorigins.herokuapp.com/get?disableCache=true&url=${encodeURIComponent(
              value,
            )}`,
          )
          .then((res) => {
            try {
              const html = domParser.parseFromString(
                res.data.contents,
                'application/xml',
              );
              const { title, description, items } = parser(html);
              const arrayOfHashes = Object.keys(items);
              state.feedInfo.push({ title, description });
              state.postsSequence = state.postsSequence.concat(
                arrayOfHashes.reverse(),
              );
              state.postsMap = { ...state.postsMap, ...items };
              state.feeds.push(value);
              schemas.repeatFeed = yup.mixed().notOneOf(state.feeds);
              state.searchInputValue = '';
              state.status = 'success_load_rss';
              View({ feed: value, renderPosts, state });
            } catch (err) {
              state.status = 'must_be_valid_rss';
            }
          })
          .catch(() => {
            state.status = 'network_error';
            state.searchInputValue = '';
          })
          .finally(() => {
            searchInput.removeAttribute('readonly');
            searchButton.disabled = false;
            render(state);
          });
      } else {
        const [rssExist, invalidUrl] = results;
        if (!rssExist) {
          state.status = 'rss_already_exist';
        } else if (!invalidUrl) {
          state.status = 'invalid_url';
          state.searchInputValue = '';
        }
        searchButton.disabled = false;
        render(state);
      }
    });
  });
};

export default App;
