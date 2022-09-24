import { LightningElement, api } from 'lwc';
import { updateRecord } from "lightning/uiRecordApi";
import IS_ACTIVE from "@salesforce/schema/User.IsActive";
import ID_FIELD from "@salesforce/schema/User.Id";
import { showToast } from 'c/customUtility';

export default class ActivateDeactivate extends LightningElement {
    btnActivateDeactivate;
    showActiveDeactive = false;
    isLoading = false;

    selectedUser = {};

    UserSelection(event) {
        if (event.detail.selectedValue && event.detail.selectedRecordId) {
            this.selectedUser.userId = event.detail.selectedRecordId;
            this.selectedUser.name = event.detail.selectedValue;
            this.selectedUser.isActive = event.detail.isActive;
              
              let checkbox = this.template.querySelector('[data-id="checkbox"]');
              checkbox.checked = this.selectedUser.isActive;
              this.btnActivateDeactivate = this.selectedUser.isActive
                ? "Deactivate"
                : "Activate";
                this.showActiveDeactive = true;
            
        } else {
            this.showActiveDeactive = false;
            let checkbox = this.template.querySelector('[data-id="checkbox"]');
            checkbox.checked = false;
        }
    }

    handleActivate() {
        this.isLoading = true;
        const fields = {};
        fields[ID_FIELD.fieldApiName] = this.selectedUser.userId;
        fields[IS_ACTIVE.fieldApiName] = !this.selectedUser.isActive;
    
        const recordInput = { fields };
    
        updateRecord(recordInput).then(() => {
          this.dispatchEvent(
            showToast('success', 'User Updated', 'success')
          );
          let checkbox = this.template.querySelector('[data-id="checkbox"]');
          checkbox.checked = !checkbox.checked;
          this.selectedUser.isActive = !this.selectedUser.isActive;
          this.btnActivateDeactivate = this.selectedUser.isActive
            ? "Deactivate"
            : "Activate";
          this.isLoading = false;
        });
      }
}