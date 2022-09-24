/* eslint-disable @lwc/lwc/no-api-reassignments*/
import { api, LightningElement, track } from "lwc";

export default class DisplayRecords extends LightningElement {
  @api tableHeaders;
  @api recordList;
  @api objectName;
  @api fieldNames;
  @api profileOptions;
  @api roleOptions;
  @api permissionDetails;
  @api permissionOptions;

  @api setPermission;

  @track columns = [];
  @track selectedPermission = [];

  @track selectedPermissionDetails;
  @track selectedProfileId;
  @track selectedRoleId;
  @track selectedProfile;
  @track selectedRole;
  @track selectedUserName;

  @track showModal = false;
  @track isModalLoading = false;
  @track showPermission = false;

  handleRowAction(event) {
    let row = event.detail.row;
    if(event.detail.action.name === 'viewPermission') {
      this.selectedPermission = [];
      /* let index = this.permissionDetails.findIndex(
          (rec) => rec.Username ===  row.Username
        );
      if(index > -1) {
        this.selectedPermissionDetails = this.permissionDetails[index];
        this.selectedPermission = this.selectedPermissionDetails.permissions;
        this.showPermission = true;
      } else {
        //
      } */
      if(row.permissionDetails) {
        this.selectedPermission = row.permissionDetails;
        this.showPermission = true;
      }
    } else if (event.detail.action.name === "delete") {
      //using filter with new variable inorder to rerender the table data
      let newData = [...this.recordList];
      let index = newData.findIndex((obj) => obj.Username === row.Username);
      if (index > -1) {
        newData.splice(index, 1);
        this.recordList = [...newData];
        //crete the event to pass value back to the parent
        let payLoad = { Username: row.Username };
        const evt = new CustomEvent("recordchange", { detail: payLoad });
        this.dispatchEvent(evt);
      }
    } else if (event.detail.action.name === "edit") {
      this.isModalLoading = true;
      // eslint-disable-next-line no-unused-vars
      new Promise((resolve, reject) => {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
          this.processRecordEditForm(row);
          resolve();
        }, 500);
        // eslint-disable-next-line no-return-assign
      }).then(() => (this.isModalLoading = false));
    }
  }

  processRecordEditForm(row) {
    this.selectedUserName = row.Username;
    this.columns = [];
    for (let col of this.fieldNames) {
      let flag = col.trim() === "Username" ? true : false;
      let value = row[col.trim()];
      if (col.trim() === "ProfileId") {
        let index = this.profileOptions.findIndex(
          (rec) => rec.label === row[col.trim()]
        );
        if (index > -1) {
          value = this.profileOptions[index].value.trim();
        } else {
          value = null;
        }
      } else if (col.trim() === "UserRoleId") {
        let index = this.roleOptions.findIndex(
          (rec) => rec.label === row[col.trim()]
        );
        if (index > -1) {
          value = this.roleOptions[index].value.trim();
        } else {
          value = null;
        }
      }

      let profileOrRole =
        col.trim() === "ProfileId" || col.trim() === "UserRoleId"
          ? true
          : false;
      let objectApiName = "";
      if (col.trim() === "ProfileId") {
        objectApiName = "Profile";
      } else if (col.trim() === "UserRoleId") {
        objectApiName = "UserRole";
      }
      let details = {
        label: col.trim(),
        value: value ? value : null,
        isDisabled: flag,
        isProfileorRole: profileOrRole,
        objectApiName: objectApiName
      };
      this.columns = [...this.columns, details];
    }
    this.showModal = true;
  }

  handleSubmit(event) {
    event.preventDefault();
    const inputFields = this.template.querySelectorAll("lightning-input-field");

    let userName = {};
    if (inputFields) {
      inputFields.forEach((field) => {
        if (field.fieldName === "Username") {
          userName = field.value;
        }
      });
    }

    if (userName) {
      let index = this.recordList.findIndex((rec) => rec.Username === userName);
      let newData = JSON.parse(JSON.stringify(this.recordList));
      if (index > -1) {
        for (let field of inputFields) {
          newData[index][field.fieldName] = field.value;
        }
        this.recordList = [...newData];
      }
      this.showModal = false;
    }
  }

  closeModal(event) {
    if(event.target.dataset.id === 'recordEditModal') {
      this.showModal = false;
    } else {
      this.showPermission = false;
    }
  }

  @api
  getSelectedRecords() {
    return this.template.querySelector("lightning-datatable").getSelectedRows();
  }

  onProfileOrRoleSelection(event) {
    if (event.detail.selectedValue && event.detail.objectName) {
      let newData = JSON.parse(JSON.stringify(this.recordList));
      let index = this.recordList.findIndex(
        (rec) => rec.Username === this.selectedUserName
      );
      let fieldName = event.detail.objectName + "Id";
      if (index > -1) {
        newData[index][fieldName] = event.detail.selectedValue;
      }
      this.recordList = [...newData];
    }
  }

  handleRemovePermissions(event) {
    const index = event.detail.name;
    const _permissions = [...this.selectedPermission];

    if(index > -1) {
      _permissions.splice(index, 1);
      this.selectedPermission = [..._permissions];
      this.setPermission(this.selectedPermissionDetails.Username, this.selectedPermission);
      //this.selectedPermissionDetails.permissions = [..._permissions];
    }
  }

  editSubmit(event) {
    event.preventDefault();
  }

  editError(event) {
    event.preventDefault();
  }
}