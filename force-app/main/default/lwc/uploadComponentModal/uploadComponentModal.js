import { LightningElement, api } from 'lwc';
import { showToast } from "c/customUtility";
import getPermissionDetails from "@salesforce/apex/recordCreatorClass.getPermissionDetails";
import getProfileDetails from "@salesforce/apex/recordCreatorClass.getProfileDetails";
import getRoleDetails from "@salesforce/apex/recordCreatorClass.getRoleDetails";

export default class UploadComponentModal extends LightningElement {

    @api selectedRecords;
    @api recordList;

    showCloneData = false;
    isAdvancedFilter = false
    isModalLoading = false;
    showPillContainer = false;
    isRolesAdded = false;

    selectedFilters = [];
    filterRoleOpions = [];
    permissionDetails = [];
    permissionSetOptions;

    profileOptions;
    roleOptions;
    selectedProfile;
    selectedRole;
    selectedPermissions;
    profileFilter;
    roleFilter;
    permissionFilter;
    cloneFilter;

    get radioOptions() {
      return [
        { label: "All", value: "All" },
        { label: "Selected", value: "Selected" }
      ];
    }

    connectedCallback() {
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
      this.handleRoleDetails();
    }

    handleRoleDetails() {
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

    handleProfileChange(event) {
        this.selectedProfile = event.target.options.find(
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
            showToast("Error", "Duplicate Value", "error");
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
          showToast("Error","Please select the Role and Profile","error");
        }
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

    handlePermisssionSelected(event) {
      this.selectedPermissions = event.detail.value.map((option) =>
        this.permissionSetOptions.find((o) => o.value === option)
      );
    }

    handleRoleChange(event) {
      this.selectedRole = event.target.options.find(
        (opt) => opt.value === event.detail.value
      ).label;
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
    }

    processModalSave(source) {
      //Deep clone the value as it is mutated
        let newData = JSON.parse(JSON.stringify(this.recordList));

        //TODO: Move this code block to separate method and make it dynamic
        if (this.selectedProfile && this.profileFilter) {
          if (this.profileFilter === "All") {
            for (let i = 0; i < newData.length; i++) {
              newData[i].ProfileId = this.selectedProfile;
            }
          } else if (this.profileFilter === "Selected") {
            for (let data of this.selectedRecords) {
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
            for (let data of this.selectedRecords) {
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
              /* let permissionInfo = {
                Username: newData[i].Username,
                permissions: this.selectedPermissions
              }; */
              //this.permissionDetails = [...this.permissionDetails, permissionInfo];
              newData[i].permissionDetails = this.selectedPermissions;
            }
          } else if (this.permissionFilter === "Selected") {
            for (let data of this.selectedRecords) {
              let index = newData.findIndex(
                (obj) => obj.Username === data.Username
              );
              if (index > -1) {
                newData[index].permissionDetails = this.selectedPermissions;
              }
              /* let permissionInfo = {
                userName: data.Username,
                permissions: this.selectedPermissions
              };
              this.permissionDetails = [...this.permissionDetails, permissionInfo]; */
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
            for (let data of this.selectedRecords) {
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
        const evt = new CustomEvent("recordupdate", {
          detail: this.recordList
        });
        this.dispatchEvent(evt);
        this.selectedFilters = [];
        this.isAdvancedFilter = false;
    }

    closeAdvancedFilter() {
        this.isAdvancedFilter = false;
    }

    closeModal() {
        this.showCloneData = false;
        this.isAdvancedFilter = false;
        //fire an event to close the modal
        const evt = new CustomEvent("closemodal");
        this.dispatchEvent(evt);
    }
}