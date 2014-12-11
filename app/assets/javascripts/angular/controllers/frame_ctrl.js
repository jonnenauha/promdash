angular.module("Prometheus.controllers").controller('FrameCtrl', ["$scope",
                                                    "$sce", "$timeout",
                                                    "VariableInterpolator",
                                                    "URLHashEncoder",
                                                    "InputHighlighter",
                                                    "WidgetLinkHelper",
                                                    "GraphiteTimeConverter",
                                                    "WidgetTabService",
                                                    function($scope, $sce,
                                                             $timeout,
                                                             VariableInterpolator,
                                                             URLHashEncoder,
                                                             InputHighlighter,
                                                             WidgetLinkHelper,
                                                             GraphiteTimeConverter,
                                                             WidgetTabService) {
  // Appended to frame source URL to trigger refresh.
  $scope.refreshCounter = 0;
  WidgetTabService($scope);

  $scope.generateWidgetLink = function(event) {
    if ($scope.showTab !== 'staticlink') {
      return;
    }
    var graphBlob = {};
    graphBlob.widget = $scope.frame;
    graphBlob.globalConfig = dashboardData.globalConfig;
    WidgetLinkHelper
      .createLink({
         encoded_url: URLHashEncoder(graphBlob),
         graph_title: $scope.getTitle(),
         dashboard_name: dashboardName
       }, event)
      .setLink($scope)
      .highlightInput(event);
  };

  function buildFrameURL(url) {
    var parser = document.createElement('a');
    parser.href = url;
    var queryStringComponents = parser.search.substring(1).split('&');
    if ($scope.frame.graphite) {
      if (url.indexOf("until") === -1) {
        queryStringComponents.push("until=now");
      }
      queryStringComponents = queryStringComponents.map(function(e) {
        switch (0) {
        case e.indexOf('height='):
          return setDimension(e, $scope.frameHeight().height);
        case e.indexOf('width='):
          var width = $scope.frameHeight().height / $scope.aspectRatio;
          return setDimension(e, width);
        case e.indexOf('from='):
          if (!$scope.frame.range) {
            return e;
          }
          return setDimension(e, GraphiteTimeConverter.graphiteFrom($scope.frame.range, $scope.frame.endTime));
        case e.indexOf('until='):
          return setDimension(e, GraphiteTimeConverter.graphiteUntil($scope.frame.endTime));
        }
        return e;
      });
      queryStringComponents.push("bgcolor=%23191919");
    }
    parser.search = '?' + queryStringComponents.join('&') + '&decache=' + $scope.refreshCounter;
    return parser.href;
  }

  function setDimension(dimensionKeyValue, dimensionValue) {
    var split = dimensionKeyValue.split("=");
    split[1] = dimensionValue;
    return split.join("=");
  }

  $scope.getTitle = function() {
    if ($scope.frame.title) {
      return VariableInterpolator($scope.frame.title, $scope.vars);
    } else if ($scope.frame.url) {
      if ($scope.frame.url.length > 60) {
        return $scope.frame.url.substr(0, 57) + '...';
      }
      return $scope.frame.url;
    } else {
      return "New Frame";
    }
  };

  $scope.frameURL = function() {
    var url = VariableInterpolator($scope.frame.url, $scope.vars);
    return $sce.trustAsResourceUrl(buildFrameURL(url));
  };

  $scope.refreshFrame = function() {
    $scope.refreshCounter++;
  };

  $scope.$on('setRange', function(ev, range) {
    $scope.frame.range = range;
  });

  $scope.$on('setEndTime', function(ev, endTime) {
    $scope.frame.endTime = endTime;
  });

  $scope.$on('refreshDashboard', function(ev) {
    $scope.refreshFrame();
  });

  $scope.generateFrameComponents = function() {
    var parser = document.createElement("a");
    parser.href = $scope.frame.url;
    // [foo=bar, baz=quux]
    var queryStringComponents = parser.search.substring(1).split("&");
    // [{foo: bar}, {baz: quux}]
    $scope.frameComponents = queryStringComponents.map(function(kv) {
      var kvArr = kv.split("=");
      return {
        key: kvArr[0],
        value: kvArr[1] === undefined ? undefined : decodeURIComponent(kvArr[1]),
      };
    });
    console.log($scope.frameComponents);
  }

  $scope.generateFrameComponents();

  $scope.skipComponent = function(key) {
    return ["width", "height", "from", "until"].indexOf(key) > -1;
  };

  $scope.$watch("frameComponents", function(newValue, oldValue) {
    if (angular.equals(newValue, oldValue)) {
      return;
    }
    var parser = document.createElement("a");
    parser.href = $scope.frame.url;
    parser.search = "?" + $scope.frameComponents.map(function(o) {
      if (o.value !== undefined) {
        return o.key + "=" + encodeURIComponent(o.value);
      } else {
        return o.key;
      }
    }).join("&");
    $scope.frame.url = parser.href;
  }, true);
}]);
