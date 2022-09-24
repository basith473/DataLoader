import { api, LightningElement, track } from 'lwc';
import getLoadedRecords from "@salesforce/apex/recordCreatorClass.getLoadedRecords";
import saveRecords from "@salesforce/apex/recordCreatorClass.saveRecords";
import { showToast, getObjectFields } from "c/customUtility";

const ACTIONS = [
  { label: "View PermissionSet", name: "viewPermission" },
  { label: "Edit", name: "edit" },
  { label: "Delete", name: "delete" }
];

export default class UploadComponent extends LightningElement {

    @api objectOptions;
    @track submitClass = "slds-show";

    actions = ACTIONS;

    selectedUploadObject;
    permissionSetOptions;
    selectedRecords;
    totalRecordCount = 0;
    totalRecordCount = 0;
    sumbittedRecordCount = 0;
    failedRecordCount = 0;
    tableHeaders = [];
    @track recordList = [];
    failedRecords = [];
    profileOptions = [];
    roleOptions = [];
    columns = [];
    permissionDetails = [];

    showUpload = false;
    isLoading = false;
    displayTable = false;
    showToggle = false;
    openModal = false;
    showSubmittedRecords = false;

    get acceptedFormats() {
        return [".csv"];
    }

    handleUploadChange(event) {
        this.selectedUploadObject = event.target.value;
        if (this.selectedUploadObject) {
          getObjectFields(this.selectedUploadObject)
            .then((result) => {
              this.columns = result;
            })
            .catch((err) => {
              console.log(err);
            });
          this.showUpload = true;
        } else {
          this.showUpload = false;
        }
    }

    handleUploadFinished(event) {
        // Get the list of uploaded files
        this.isLoading = true;
        const uploadedFiles = event.detail.files;
    
        const params = {
          documentId: uploadedFiles[0].documentId,
          objectApiName: this.selectedUploadObject
        };
    
        getLoadedRecords(params).then((result) => {
          if (result.includes("Field Not Found")) {
            result += "Please check the Excel";
            showToast("Error", result, "error", null);
          } else {
            result = JSON.parse(result);
            this.tableHeaders = result.columns;
            this.tableHeaders = [
              ...this.tableHeaders,
              { type: "action", typeAttributes: { rowActions: this.actions } }
            ];
            this.totalRecordCount = result.records.length;
            this.recordList = result.records;
            if (this.recordList.length > 0) {
              this.displayTable = true;
            }
          }
          this.isLoading = false;
        });
    }

    updateRecord(event) {
      this.recordList = event.detail;
    }

    handleToggle(event) {
        this.showSubmittedRecords = !this.showSubmittedRecords;
        if (this.showSubmittedRecords) {
          this.recordList = this.successRecords;
          this.submitClass = "slds-hide";
        } else {
          this.recordList = this.failedRecords;
          this.submitClass = "slds-show";
        }
    }

    handleUpdateRecords() {
        this.selectedRecords = this.template.querySelectorAll("c-display-records")[0].getSelectedRecords();
        this.clearValues();
        this.openModal = true;
    }

    clearValues() {
        this.selectedProfile = "";
        this.selectedRole = "";
        this.profileFilter = "";
        this.roleFilter = "";
        this.cloneFilter = "";
        this.selectedUser = {};
        this.advancedFilters = [];
        this.roleOptions = [];
    }

    //Event handled from the child component to update the Records
    updateRecordList(event) {
        let Username = event.detail.Username;
        let index = this.recordList.findIndex((obj) => obj.Username === Username);
        if (index > -1) {
            this.recordList.splice(index, 1);
        }
        this.setPermissionDetails(Username, []);
    }

    setPermissionDetails (Username, updatedPermission) {
        const index = this.permissionDetails.findIndex(
          (obj) => obj.Username === Username
        );
        if (index > -1) {
          if(updatedPermission.length > 0){
            this.permissionDetails[index].permissions = [...updatedPermission];
          } else {
            this.permissionDetails.splice(index, 1);
          }
        }
    };

    handleSubmit() {
        //update the Role id and Profile id before saving the record.
        // eslint-disable-next-line vars-on-top
        var permDetails = [];
        if (this.recordList) {
          let recordsToInsert = [...this.recordList];
          for (let data of recordsToInsert) {
            if (data.ProfileId) {
              let index = this.profileOptions.findIndex(
                (obj) => obj.label === data.ProfileId
              );
              if (index > -1) {
                data.ProfileId = this.profileOptions[index].value;
              }
            }
            if (data.UserRoleId && data.UserRoleId !== undefined) {
              let index = this.roleOptions.findIndex(
                (obj) => obj.label === data.UserRoleId
              );
              if (index > -1) {
                data.UserRoleId = this.roleOptions[index].value;
              }
            }
          }
    
          //check if permission is assigned
          if(this.permissionDetails.length > 0) {
            this.permissionDetails.forEach((rec) => {
              let permList = [];
              rec.permissions.forEach((perm) => {
                permList.push(perm.value);
              })
              permDetails.push({Username: rec.Username, permissions: permList});
            })
          }
          
          const params = {
            jsonRecords: JSON.stringify(recordsToInsert),
            permDetails: permDetails.length > 0 ? JSON.stringify(permDetails) : null
          };
    
          saveRecords(params).then((result) => {
            if (result === "SUCCESS") {
                this.dispatchEvent(
                    showToast('Success', 'Record inserted Successfully', 'success')
                );
              this.showToggle = false;
            } else if (result) {
              this.failedRecords = [];
              result = JSON.parse(result);
              this.failedRecordCount = result.length;
              this.sumbittedRecordCount = this.totalRecordCount - this.failedRecordCount;
              for (let data of result) {
                this.failedRecords = [...this.failedRecords, data.record];
              }
              if (this.failedRecordCount > 0) {
                this.successRecords = this.recordList.filter(
                  (value) =>
                    !this.failedRecords
                      .map((rec) => rec.Username)
                      .includes(value.Username)
                );
                this.showToggle = true;
              }
              this.dispatchEvent(
                  showToast('Error', null, 'error', result)
              );
            }
          });
        }
    }

    closeModal() {
      this.openModal = false;
    }
}