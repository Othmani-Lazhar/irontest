'use strict';

//  NOTICE:
//    The $scope here prototypically inherits from the $scope of TestcasesController,
angular.module('irontest').controller('DataTableController', ['$scope', 'IronTestUtils', '$stateParams', 'DataTable',
    '$timeout', '$uibModal', '$rootScope',
  function($scope, IronTestUtils, $stateParams, DataTable, $timeout, $uibModal, $rootScope) {
    var DATA_TABLE_GRID_EDITABLE_HEADER_CELL_TEMPLATE = 'dataTableGridEditableHeaderCellTemplate.html';

    var stringCellUpdate = function(dataTableCellId, newValue) {
      DataTable.updateCell({
        testcaseId: $stateParams.testcaseId
      }, {
        id: dataTableCellId,
        value: newValue
      }, function() {
        $scope.$emit('successfullySaved');
      }, function(response) {
        IronTestUtils.openErrorHTTPResponseModal(response);
      });
    };

    $scope.dataTableGridOptions = {
      enableSorting: false,
      onRegisterApi: function(gridApi) {
        gridApi.edit.on.afterCellEdit($scope, function(rowEntity, colDef, newValue, oldValue){
          if (newValue !== oldValue) {
            stringCellUpdate(rowEntity[colDef.name].id, newValue);
          }
        });
      }
    };

    var refreshDataTableGrid = function() {
      var dataTable = $scope.dataTable;
      delete $scope.dataTable;
      $timeout(function() {
        $scope.dataTable = dataTable;
      }, 0);
    };

    var deleteColumn = function(columnId) {
      DataTable.deleteColumn({ testcaseId: $stateParams.testcaseId, columnId: columnId }, {}, function(dataTable) {
        $scope.$emit('successfullySaved');
        updateDataTableGrid(dataTable);
      }, function(response) {
        IronTestUtils.openErrorHTTPResponseModal(response);
      });
    };

    var getDefaultColumnDef = function(dataTableColumnId, columnName, dataTableColumnType) {
      return {
        dataTableColumnId: dataTableColumnId,    //  not standard ui grid property for column def
        dataTableColumnType: dataTableColumnType,    //  not standard ui grid property for column def
        name: columnName,
        displayName: columnName,  //  need this line to avoid underscore in column name is not displayed in column header
        // determine column min width according to the length of column name
        // assuming each character deserves 8 pixels
        // 30 pixels for displaying grid header menu arrow
        minWidth: columnName.length * 8 + 30,
        enableColumnMenu: columnName === 'Caption' ? false : true,
        enableHiding: false,
        menuItems: [
          {
            title: 'Rename Column',
            icon: 'glyphicon glyphicon-edit',
            action: function() {
              this.context.col.colDef.headerCellTemplate = DATA_TABLE_GRID_EDITABLE_HEADER_CELL_TEMPLATE;

              refreshDataTableGrid();
            },
            shown: function() {
              return !$rootScope.appStatus.isForbidden();
            }
          },
          {
            title: 'Delete Column',
            icon: 'glyphicon glyphicon-trash',
            action: function() {
              deleteColumn(this.context.col.colDef.dataTableColumnId);
            },
            shown: function() {
              return !$rootScope.appStatus.isForbidden();
            }
          }
        ]
      };
    };

    var updateDataTableGrid = function(dataTable, lastColumnHeaderInEditMode) {
      $scope.dataTableGridOptions.columnDefs = [];
      for (var i = 0; i < dataTable.columns.length; i++) {
        var dataTableColumn = dataTable.columns[i];
        var columnName = dataTableColumn.name;
        var uiGridColumn = getDefaultColumnDef(dataTableColumn.id, columnName, dataTableColumn.type);
        if (lastColumnHeaderInEditMode === true && i === dataTable.columns.length - 1) {
          uiGridColumn.headerCellTemplate = DATA_TABLE_GRID_EDITABLE_HEADER_CELL_TEMPLATE;
        }
        if (dataTableColumn.type === 'String') {    //  it is a string column
          uiGridColumn.enableCellEdit = true;
          uiGridColumn.enableCellEditOnFocus = true;
          uiGridColumn.editModelField = columnName + '.value';
          uiGridColumn.cellTemplate = 'dataTableGridStringCellTemplate.html';
          uiGridColumn.editableCellTemplate = 'dataTableGridStringEditableCellTemplate.html';
        } else {                                    //  it is an endpoint column
          uiGridColumn.enableCellEdit = false;
          uiGridColumn.cellTemplate = 'dataTableGridEndpointCellTemplate.html';
        }
        $scope.dataTableGridOptions.columnDefs.push(uiGridColumn);
      }
      var deletionColumn = {
         name: 'delete.1',  //  give this column a name that is not able to be created by user
         displayName: 'Delete', width: 70, minWidth: 60, enableCellEdit: false, enableColumnMenu: false,
         cellTemplate: 'dataTableGridDeleteCellTemplate.html'
      };
      $scope.dataTableGridOptions.columnDefs.push(deletionColumn);
      $scope.dataTableGridOptions.data = dataTable.rows;
    };

    $scope.findByTestcaseId = function() {
      DataTable.get({ testcaseId: $stateParams.testcaseId }, function(dataTable) {
        updateDataTableGrid(dataTable);

        //  show the grid
        $scope.dataTable = dataTable;
      }, function(response) {
        IronTestUtils.openErrorHTTPResponseModal(response);
      });
    };

    $scope.addColumn = function(columnType) {
      DataTable.addColumn({ testcaseId: $stateParams.testcaseId, columnType: columnType }, {}, function(dataTable) {
        updateDataTableGrid(dataTable, true);
      }, function(response) {
        IronTestUtils.openErrorHTTPResponseModal(response);
      });
    };

    $scope.afterColumnNameEdit = function(col, event) {
      if (event) {
        if (event.keyCode === 13 || event.keyCode === 27) {
          event.preventDefault();
        } else {                     // keys typed other than Enter and ESC do not trigger anything
          return;
        }
      }

      var colDef = col.colDef;
      delete colDef.headerCellTemplate;
      var oldName = colDef.name;
      var newName = col.name;

      if (newName !== oldName) {
        DataTable.renameColumn({
          testcaseId: $stateParams.testcaseId, columnId: colDef.dataTableColumnId, newName: newName
        }, {
        }, function(dataTable) {
          $scope.$emit('successfullySaved');
          updateDataTableGrid(dataTable);
          refreshDataTableGrid();
        }, function(response) {
          IronTestUtils.openErrorHTTPResponseModal(response);
        });
      } else {
        refreshDataTableGrid();
      }
    };

    $scope.addRow = function() {
      DataTable.addRow({ testcaseId: $stateParams.testcaseId }, {}, function(dataTable) {
        $scope.$emit('successfullySaved');
        updateDataTableGrid(dataTable);
      }, function(response) {
        IronTestUtils.openErrorHTTPResponseModal(response);
      });
    };

    $scope.deleteRow = function(rowEntity) {
      DataTable.deleteRow({ testcaseId: $stateParams.testcaseId, rowSequence: rowEntity.Caption.rowSequence }, {
      }, function(dataTable) {
        $scope.$emit('successfullySaved');
        updateDataTableGrid(dataTable);
      }, function(response) {
        IronTestUtils.openErrorHTTPResponseModal(response);
      });
    };

    $scope.stringCellDblClicked = function(rowEntity, col) {
      var columnName = col.name;
      var oldValue = rowEntity[columnName].value;

      //  open modal dialog
      var modalInstance = $uibModal.open({
        templateUrl: '/ui/views/testcases/datatable-string-cell-textarea-editor-modal.html',
        controller: 'DataTableStringCellTextareaEditorModalController',
        size: 'lg',
        windowClass: 'datatable-string-cell-textarea-editor-modal',
        resolve: {
          rowEntity: function() {
            return rowEntity;
          },
          columnName: function() {
            return columnName;
          }
        }
      });

      //  handle result from modal dialog
      modalInstance.result.then(function closed() {}, function dismissed() {
        var newValue = rowEntity[columnName].value;
        if (newValue !== oldValue) {
          stringCellUpdate(rowEntity[columnName].id, newValue); //  save immediately (no timeout)
        }
      });
    };

    $scope.selectManagedEndpoint = function(rowEntity, col) {
      var columnName = col.name;
      var endpointType = col.colDef.dataTableColumnType.replace('Endpoint', '');

      //  open modal dialog
      var modalInstance = $uibModal.open({
        templateUrl: '/ui/views/endpoints/list-modal.html',
        controller: 'SelectManagedEndpointModalController',
        size: 'lg',
        windowClass: 'select-managed-endpoint-modal',
        resolve: {
          endpointType: function() {
            return endpointType;
          },
          titleSuffix: function() {
            return 'for [' + rowEntity.Caption.value + '] > ' + columnName;
          }
        }
      });

      //  handle result from modal dialog
      modalInstance.result.then(function closed(selectedEndpoint) {
        DataTable.updateCell({
          testcaseId: $stateParams.testcaseId
        }, {
          id: rowEntity[columnName].id,
          endpoint: { id: selectedEndpoint.id }
        }, function() {
          rowEntity[columnName].endpoint = selectedEndpoint;
          $scope.$emit('successfullySaved');
        }, function(response) {
          IronTestUtils.openErrorHTTPResponseModal(response);
        });
      }, function dismissed() {
        //  Modal dismissed. Do nothing.
      });
    };
  }
]);