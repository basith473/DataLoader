/* eslint-disable @lwc/lwc/no-async-operation */
/*eslint guard-for-in:*/
/*eslint no-unused-vars:*/
import { LightningElement, track } from "lwc";
import getObjectNames from "@salesforce/apex/recordCreatorClass.getObjectNames";
import getProfileDetails from "@salesforce/apex/recordCreatorClass.getProfileDetails";
import getRoleDetails from "@salesforce/apex/recordCreatorClass.getRoleDetails";
import getLoadedRecords from "@salesforce/apex/recordCreatorClass.getLoadedRecords";
import getUserDetails from "@salesforce/apex/recordCreatorClass.getUserDetails";
import getPermissionDetails from "@salesforce/apex/recordCreatorClass.getPermissionDetails";
import saveRecords from "@salesforce/apex/recordCreatorClass.saveRecords";
import { showToast, getObjectFields } from "c/customUtility";

const ACTIONS = [
  { label: "View PermissionSet", name: "viewPermission" },
  { label: "Edit", name: "edit" },
  { label: "Delete", name: "delete" }
];

export default class RecordCreator extends LightningElement {
  @track objectOptions = [];
  @track profileOptions = [];
  @track roleOptions = [];
  @track tableHeaders = [];
  @track recordList = [];
  @track updatedRecordList = [];
  @track advancedFilters = [];
  @track filterRoleOpions = [];
  @track selectedFilters = [];
  @track columns = [];
  @track permissionSetOptions;
  @track selectedPermissions = [];
  @track permissionDetails = [];
  @track failedRecords = [];
  @track successRecords = [];

  @track selectedDownloadObject;
  @track selectedUploadObject;
  @track selectedProfile;
  @track selectedRole;
  @track profileFilter;
  @track roleFilter;
  @track permissionFilter;
  @track cloneFilter;
  @track totalRecordCount = 0;
  @track sumbittedRecordCount = 0;
  @track failedRecordCount = 0;
  @track submitClass = "slds-show";

  @track selectedUser = {};

  @track showUpload = false;
  @track displayTable = false;
  @track openModal = false;
  @track isUpdated = false;
  @track isAdvancedFilter = false;
  @track showPillContainer = false;
  @track isRolesAdded = false;
  @track isLoading = false;
  @track isModalLoading = false;
  @track showCloneData = false;
  @track hasPermissionSet = false;
  @track showActiveDeactive = false;
  @track showToggle = false;
  @track showSubmittedRecords = false;

  actions = ACTIONS;

  // accepted Formats
  get acceptedFormats() {
    return [".csv"];
  }

  get radioOptions() {
    return [
      { label: "All", value: "All" },
      { label: "Selected", value: "Selected" }
    ];
  }

  connectedCallback() {
    getObjectNames().then((result) => {
      if (result) {
        if (result !== "Error") {
          result = JSON.parse(result);
          for (const data of result) {
            const option = {
              label: data,
              value: data
            };
            this.objectOptions = [...this.objectOptions, option];
          }
        } else {
          this.showNotification("Error", "No Records Found", "error");
        }
      }
    });
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
        this.showNotification("Error", result, "error");
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

  //Event handled from the child component to update the Records
  updateRecordList(event) {
    let Username = event.detail.Username;
    let index = this.recordList.findIndex((obj) => obj.Username === Username);
    if (index > -1) {
      this.recordList.splice(index, 1);
    }
    this.setPermissionDetails(Username, []);
  }

  handleProfileChange(event) {
    this.selectedProfile = event.target.options.find(
      (opt) => opt.value === event.detail.value
    ).label;
  }

  handleRoleChange(event) {
    this.selectedRole = event.target.options.find(
      (opt) => opt.value === event.detail.value
    ).label;
  }

  handleRadioButton(event) {
    if (event.target.name === "radioGroupProfile") {
      this.profileFilter = event.target.value;
    } else if (event.target.name === "radioGroupRole") {
      this.roleFilter = event.target.value;
    } else if (event.target.name === "radioGroupPermission") {
      this.permissionFilter = event.target.value;
    } else {
      this.cloneFilter = event.target.value;
    }
  }

  handleSubmit() {
    //update the Role id and Profile id before saving the record.
    console.log(this.permissionDetails);
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
          this.showNotification(
            "Success",
            "Record inserted Successfully",
            "success"
          );
          this.showToggle = false;
        } else if (result) {
          this.failedRecords = [];
          result = JSON.parse(result);
          this.failedRecordCount = result.length;
          this.sumbittedRecordCount =
            this.totalRecordCount - this.failedRecordCount;
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
          this.showNotification("Error", "", "error", result);
        }
      });
    }
  }

  handleUpdateRecords() {
    this.profileOptions = [];
    getProfileDetails().then((result) => {
      if (result) {
        result = JSON.parse(result);
        for (let key in result) {
          const option = {
            label: result[key],
            value: key
          };
          this.profileOptions = [...this.profileOptions, option];
        }
      }
    });

    this.getRoleDetails();
    this.selectedProfile = "";
    this.selectedRole = "";
    this.profileFilter = "";
    this.roleFilter = "";
    this.cloneFilter = "";
    this.selectedUser = {};
    this.advancedFilters = [];
    this.openModal = true;
  }

  handlePermissionSet() {
    //TODO: need some research on this
  }

  showModal() {
    this.openModal = true;
  }

  getRoleDetails() {
    this.roleFilter = "";
    this.roleOptions = [];
    getRoleDetails().then((result) => {
      if (result) {
        result = JSON.parse(result);
        for (let key in result) {
          const option = {
            label: result[key],
            value: key
          };
          this.roleOptions = [...this.roleOptions, option];
        }
      }
    });
  }

  closeModal() {
    this.showCloneData = false;
    this.isAdvancedFilter = false;
    this.openModal = false;
  }

  handleModalSave(event) {
    this.isModalLoading = true;
    let source = event.target.name;
    new Promise((resolve, reject) => {
      setTimeout(() => {
        this.processModalSave(source);
        resolve();
      }, 500);
    }).then(
      // eslint-disable-next-line no-return-assign
      () => (this.isModalLoading = false)
    );
    //this.openModal = false;
  }

  processModalSave(source) {
    let newData = this.recordList;
    let selectedRecords = this.template
      .querySelectorAll("c-display-records")[0]
      .getSelectedRecords();

    //TODO: Move this code block to separate method and make it dynamic
    if (this.selectedProfile && this.profileFilter) {
      if (this.profileFilter === "All") {
        for (let i = 0; i < newData.length; i++) {
          newData[i].ProfileId = this.selectedProfile;
        }
      } else if (this.profileFilter === "Selected") {
        for (let data of selectedRecords) {
          let index = newData.findIndex(
            (obj) => obj.Username === data.Username
          );
          if (index > -1) {
            newData[index].ProfileId = this.selectedProfile;
          }
        }
      }
    }

    if (this.selectedRole && this.roleFilter) {
      if (this.roleFilter === "All") {
        for (let i = 0; i < newData.length; i++) {
          newData[i].UserRoleId = this.selectedRole;
        }
      } else if (this.roleFilter === "Selected") {
        for (let data of selectedRecords) {
          let index = newData.findIndex(
            (obj) => obj.Username === data.Username
          );
          if (index > -1) {
            newData[index].UserRoleId = this.selectedRole;
          }
        }
      }
    }

    if (this.selectedPermissions && this.permissionFilter) {
      if (this.permissionFilter === "All") {
        for (let i = 0; i < newData.length; i++) {
          let permissionInfo = {
            Username: newData[i].Username,
            permissions: this.selectedPermissions
          };
          this.permissionDetails = [...this.permissionDetails, permissionInfo];
        }
      } else if (this.permissionFilter === "Selected") {
        for (let data of selectedRecords) {
          let permissionInfo = {
            userName: data.Username,
            permissions: this.selectedPermissions
          };
          this.permissionDetails = [...this.permissionDetails, permissionInfo];
        }
      }
    }

    if (source === "Clone") {
      if (this.cloneFilter === "All") {
        for (let i = 0; i < newData.length; i++) {
          newData[i].ProfileId = this.selectedUser.profileName;
          newData[i].UserRoleId = this.selectedUser.roleName;
        }
      } else if (this.cloneFilter === "Selected") {
        for (let data of selectedRecords) {
          let index = newData.findIndex(
            (obj) => obj.Username === data.Username
          );
          if (index > -1) {
            newData[index].ProfileId = this.selectedUser.profileName;
            newData[index].UserRoleId = this.selectedUser.roleName;
          }
        }
      }
    }

    //implement the advanced filter
    if (this.selectedFilters.length > 0) {
      this.processAdvancedFilter();
    }

    this.recordList = [...newData];
    this.selectedFilters = [];
    this.isAdvancedFilter = false;
  }

  processAdvancedFilter() {
    let updatedList = [...this.recordList];
    for (let data of this.selectedFilters) {
      let details = data.label.split(":");
      for (let record of updatedList) {
        if (record.UserRoleId === details[0].trim()) {
          record.ProfileId = details[1].trim();
        }
      }
    }
    this.recordList = [...updatedList];
  }

  showAdvancedFilter() {
    this.filterRoleOpions = [];
    //process the available role in the table ?
    for (let data of this.recordList) {
      if (data.UserRoleId.trim() && data.UserRoleId.trim() !== "") {
        let index = this.filterRoleOpions.findIndex(
          (obj) => obj.label === data.UserRoleId
        );
        console.log("index -- " + index);
        if (index < 0) {
          const option = {
            label: data.UserRoleId,
            value: data.UserRoleId
          };
          this.filterRoleOpions = [...this.filterRoleOpions, option];
        }
      }
    }
    if (this.filterRoleOpions.length > 0) {
      this.isRolesAdded = true;
    } else {
      this.isRolesAdded = false;
    }
    this.isAdvancedFilter = true;
  }

  closeAdvancedFilter() {
    this.isAdvancedFilter = false;
  }

  applyAdvancedFilter() {
    let selectedRoleId = this.template.querySelector(
      "[data-id=advancedFilterRole]"
    );
    let selectedProfileId = this.template.querySelector(
      "[data-id=advancedFilterProfile]"
    );

    if (selectedRoleId.value && selectedProfileId.value) {
      let selectedRole = this.roleOptions.filter(function (role) {
        return role.label === selectedRoleId.value;
      });

      let selectedProfile = this.profileOptions.filter(function (profile) {
        return profile.value === selectedProfileId.value;
      });

      let str = String(
        selectedRole[0].label + " : " + selectedProfile[0].label
      );

      if (this.selectedFilters.includes({ label: str })) {
        this.showNotification("Error", "Duplicate Value", "error");
      } else {
        this.selectedFilters = [...this.selectedFilters, { label: str }];

        if (this.selectedFilters.length > 0) {
          this.showPillContainer = true;
        }

        //resetting the Role and Profile combobox
        this.template.querySelector("[data-id=advancedFilterRole]").value = "";
        this.template.querySelector("[data-id=advancedFilterProfile]").value =
          "";
      }
    } else {
      this.showNotification(
        "Error",
        "Please select the Role and Profile",
        "error"
      );
    }
  }

  handleRemoveFilter(event) {
    const index = event.detail.index;
    const _items = this.selectedFilters;

    if (index > -1) {
      _items.splice(index, 1);
      this.selectedFilters = [..._items];
    }
    if (this.selectedFilters.length < 1) {
      this.showPillContainer = false;
    }
  }

  handlePermisssionSelected(event) {
    this.selectedPermissions = event.detail.value.map((option) =>
      this.permissionSetOptions.find((o) => o.value === option)
    );
  }

  handlePermissionTab(event) {
    if (!this.permissionSetOptions) {
      getPermissionDetails({ userId: null }).then((result) => {
        this.permissionSetOptions = [];
        for (let key in result) {
          const option = {
            label: result[key],
            value: key
          };
          this.permissionSetOptions = [...this.permissionSetOptions, option];
        }
      });
    }
  }

  UserSelection(event) {
    if (event.detail.selectedValue && event.detail.selectedRecordId) {
      this.selectedUser.userId = event.detail.selectedRecordId;
      this.selectedUser.name = event.detail.selectedValue;
      this.selectedUser.isActive = event.detail.isActive;
      
        const params = {
          userId: this.selectedUser.userId
        };

        getUserDetails(params).then((result) => {
          let userDetail = JSON.parse(result);
          this.selectedUser.profileId = userDetail.profileId;
          this.selectedUser.profileName = userDetail.profileName;
          this.selectedUser.roleId = userDetail.roleId;
          this.selectedUser.roleName = userDetail.roleName;
          for (let key in userDetail.permissionSetDetails) {
            const option = {
              label: userDetail.permissionSetDetails[key],
              value: key
            };

            this.permissionSetOptions = [...this.permissionSetOptions, option];
          }
          if (this.permmissionSetOptions) {
            this.hasPermissionSet = true;
          }
          this.showCloneData = true;
        });
    }
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

  showNotification(title, message, variant, errorList) {
    this.dispatchEvent(
      showToast(title, message, variant, errorList)
    );
  }
}