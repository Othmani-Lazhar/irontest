//  Add underscore to AngularJS
angular.module('underscore', [])
  .factory('_', ['$window', function($window) {
    return $window._; // assumes underscore has already been loaded on the page
  }]);

// Declare app level module dependencies
angular.module('irontest', ['ngResource', 'ngSanitize', 'ui.router', 'ui.grid', 'ui.grid.resizeColumns',
    'ui.grid.moveColumns', 'ui.grid.pagination', 'ui.grid.edit', 'ui.grid.cellNav', 'ui.grid.selection',
    'ui.grid.draggable-rows', 'ui.bootstrap', 'underscore', 'ngFileUpload', 'ngJsTree'])
  .factory('authInterceptor', ['$q', '$rootScope', function($q, $rootScope) {
    return {
      responseError: function(response) {
        if (response.status === 401){
          $rootScope.logout();
        }
        return $q.reject(response);
      }
    };
  }])
  .config(['$httpProvider', '$stateProvider', '$urlRouterProvider', function(
      $httpProvider, $stateProvider, $urlRouterProvider) {

    $httpProvider.interceptors.push('authInterceptor');

    // set default (home) view for the right pane
    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: '/ui/views/blank.html'
      })
  }])
  .run(['$rootScope', '$http', '$window', 'IronTestUtils', function($rootScope, $http, $window, IronTestUtils) {
    //  initialize appStatus
    $rootScope.appStatus = {
      appMode: null,
      userInfo: angular.fromJson($window.localStorage.userInfo),
      isInTeamMode: function() {
        return this.appMode === 'team';
      },
      isUserAuthenticated: function() {
        return (this.userInfo);
      },
      isAdminUser: function() {
        return this.isUserAuthenticated() && this.userInfo.roles.indexOf("admin") > -1;
      },
      //  rolesAllowed is reserved for future use
      //  for now, the function involves authentication but not authorization
      isForbidden: function(rolesAllowed) {
        return this.isInTeamMode() && !this.isUserAuthenticated();
      },
      getUserId: function() {
        return this.userInfo.id;
      },
      getUsername: function() {
        return this.userInfo.username;
      }
    };

    //  keep user logged in after page refresh
    if ($rootScope.appStatus.userInfo) {
      $http.defaults.headers.common.Authorization = $rootScope.appStatus.userInfo.authHeaderValue;
    }

    //  fetch app info from server side
    $rootScope.appStatusPromise = $http.get('api/appinfo')
      .then(function successCallback(response) {
        $rootScope.appStatus.appMode = response.data.appMode;
      }, function errorCallback(response) {
        IronTestUtils.openErrorHTTPResponseModal(response);
      });

    $rootScope.logout = function() {
      //  log out only when currently logged in, to avoid unnecessary folder tree refresh
      if ($rootScope.appStatus.userInfo || $window.localStorage.userInfo ||
          $http.defaults.headers.common.Authorization) {
        $rootScope.appStatus.userInfo = null;
        $window.localStorage.removeItem("userInfo");
        delete $http.defaults.headers.common.Authorization;

        $rootScope.$emit('userLoggedOut');    //  not using broadcast, for better performance
      }
    };
  }]);
