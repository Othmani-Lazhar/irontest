'use strict';

//  NOTICE:
//    The $scope here prototypically inherits from the $scope of TeststepsActionController.
//    ng-include also creates a scope.
angular.module('irontest').controller('SOAPTeststepActionController', ['$scope', '$rootScope', 'Teststeps', 'IronTestUtils', '$uibModal',
    'uiGridConstants', '$timeout',
  function($scope, $rootScope, Teststeps, IronTestUtils, $uibModal, uiGridConstants, $timeout) {
    const HTTP_HEADER_GRID_NAME_COLUMN_WIDTH = '30%';
    $scope.showHTTPHeaders = false;

    var clearRunStatus = function() {
      $scope.steprun = { responseHttpHeaders: [] };
    };

    clearRunStatus();

    var createHTTPHeader = function(gridMenuEvent) {
      $scope.teststep.otherProperties.httpHeaders.push(
        { name: 'name1', value: 'value1' }
      );
      $scope.update(true, function selectTheNewRow() {
        var headers = $scope.teststep.otherProperties.httpHeaders;
        $scope.requestHTTPHeaderGridApi.grid.modifyRows(headers);
        $scope.requestHTTPHeaderGridApi.selection.selectRow(headers[headers.length - 1]);
      });
    };

    var deleteHTTPHeader = function(gridMenuEvent) {
      var selectedRow = $scope.requestHTTPHeaderGridApi.selection.getSelectedRows()[0];
      var httpHeaders = $scope.teststep.otherProperties.httpHeaders;
      IronTestUtils.deleteArrayElementByProperty(httpHeaders, '$$hashKey', selectedRow.$$hashKey);
      $scope.update(true);
    };

    $scope.$watch('teststep.otherProperties.httpHeaders', function() {
      $scope.requestHTTPHeaderGridOptions.data = $scope.teststep.otherProperties.httpHeaders;
    });

    $scope.requestHTTPHeaderGridOptions = {
      enableSorting: false, enableRowHeaderSelection: false, multiSelect: false,
      enableGridMenu: true, enableColumnMenus: false, gridMenuShowHideColumns: false,
      rowHeight: 20, enableHorizontalScrollbar: uiGridConstants.scrollbars.NEVER,
      columnDefs: [
        { name: 'name', width: HTTP_HEADER_GRID_NAME_COLUMN_WIDTH,
          headerTooltip: 'Double click to edit', enableCellEdit: true,
          editableCellTemplate: 'httpHeaderGridEditableCellTemplate.html' },
        { name: 'value', headerTooltip: 'Double click to edit', enableCellEdit: true, cellTooltip: true,
          editableCellTemplate: 'httpHeaderGridEditableCellTemplate.html' }
      ],
      gridMenuCustomItems: [
        { title: 'Create', order: 210, action: createHTTPHeader,
          shown: function() {
            return !$rootScope.appStatus.isForbidden();
          }
        },
        { title: 'Delete', order: 220, action: deleteHTTPHeader,
          shown: function() {
            return !$rootScope.appStatus.isForbidden() &&
              $scope.requestHTTPHeaderGridApi.selection.getSelectedRows().length === 1;
          }
        }
      ],
      onRegisterApi: function (gridApi) {
        $scope.requestHTTPHeaderGridApi = gridApi;
        gridApi.edit.on.afterCellEdit($scope, function(rowEntity, colDef, newValue, oldValue){
          if (newValue !== oldValue) {
            $scope.update(true);
          }
        });
      }
    };

    $scope.$watch('steprun.responseHttpHeaders', function() {
      $scope.responseHTTPHeaderGridOptions.data = $scope.steprun.responseHttpHeaders;
    });

    $scope.responseHTTPHeaderGridOptions = {
      enableSorting: false, enableColumnMenus: false,
      rowHeight: 20, enableHorizontalScrollbar: uiGridConstants.scrollbars.NEVER,
      columnDefs: [
        { name: 'name', width: HTTP_HEADER_GRID_NAME_COLUMN_WIDTH },
        { name: 'value', cellTooltip: true }
      ]
    };

    $scope.toggleHTTPHeadersArea = function() {
      var httpHeadersArea = document.getElementById('httpHeadersArea');
      if (httpHeadersArea) {
        var elementHeight = httpHeadersArea.offsetHeight;
        $scope.$broadcast('elementRemovedFromColumn', { elementHeight: elementHeight });
      }
      $scope.showHTTPHeaders = !$scope.showHTTPHeaders;
    };

    $scope.httpHeadersAreaLoadedCallback = function() {
      $timeout(function() {
        var elementHeight = document.getElementById('httpHeadersArea').offsetHeight;
        $scope.$broadcast('elementInsertedIntoColumn', { elementHeight: elementHeight });
      });
    };

    $scope.generateRequest = function() {
      //  open modal dialog
      var modalInstance = $uibModal.open({
        templateUrl: '/ui/views/teststeps/soap/select-soap-operation-modal.html',
        controller: 'SelectSOAPOperationModalController',
        size: 'lg',
        windowClass: 'select-soap-operation-modal',
        resolve: {
          wsdlURL: function () {
            return $scope.teststep.endpoint.otherProperties.wsdlURL;
          }
        }
      });

      //  handle result from modal dialog
      modalInstance.result.then(function closed(operationInfo) {
        //  save the generated request to teststep (in parent scope/controller)
        $scope.teststep.request = operationInfo.sampleRequest;
        $scope.update(true);  //  save immediately (no timeout)
      }, function dismissed() {
        //  Modal dismissed. Do nothing.
      });
    };

    $scope.invoke = function() {
      clearRunStatus();

      var teststep = new Teststeps($scope.teststep);
      $scope.steprun.status = 'ongoing';
      teststep.$run(function(basicTeststepRun) {
        $scope.steprun.status = 'finished';
        $scope.steprun.response = basicTeststepRun.response.httpBody;
        $scope.steprun.responseHttpHeaders = basicTeststepRun.response.httpHeaders;
      }, function(error) {
        $scope.steprun.status = 'failed';
        IronTestUtils.openErrorHTTPResponseModal(error);
      });
    };
  }
]);
