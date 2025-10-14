(function (w) {
  w.__env = {
    API_BASE_URL: "${API_BASE_URL}" // injectée depuis le .env backend au déploiement
  };
})(window);
