/* eslint-disable @lwc/lwc/no-api-reassignments */
/* eslint-disable @lwc/lwc/no-async-operation */
/* eslint-disable no-unused-vars */
import { api, LightningElement, track } from "lwc";
import fetchLookUpValues from "@salesforce/apex/recordCreatorClass.fetchLookUpValues";

export default class CustomLookup extends LightningElement {
  @track recordsList;
  @track searchKey = "";
  @track selectedValue;
  @track selectedRecordId;
  @track isActive;
  @api objectApiName;
  @api iconName;
  @api lookupLabel;
  @api fieldToQuery;
  @api searchField;
  @track message;
  @api profileOrRoleId;
  @api source;

  onLeave(event) {
    setTimeout(() => {
      this.searchKey = null;
      this.recordsList = null;
    }, 500);
  }

  connectedCallback() {
    console.log("Id -- " + this.profileOrRoleId);
    if (this.profileOrRoleId) {
      this.getLookupResult();
    }
  }

  onRecordSelection(event) {
    this.selectedRecordId = event.target.dataset.key;
    this.selectedValue = event.target.dataset.name;
    this.isActive = event.target.dataset.val === "true" ? true : false;
    this.searchKey = "";
    this.onSeletedRecordUpdate();
  }

  handleKeyChange(event) {
    const searchKey = event.target.value;
    if (searchKey.length > 2) {
      this.searchKey = searchKey;
      this.getLookupResult();
    }
  }

  removeRecordOnLookup(event) {
    this.searchKey = null;
    this.selectedValue = null;
    this.selectedRecordId = null;
    this.recordsList = null;
    this.profileOrRoleId = null;
    this.onSeletedRecordUpdate();
  }

  getLookupResult() {
    if(this.searchKey || this.profileOrRoleId){
      let params = {
        objectApiName: this.objectApiName,
        fieldsToQuery: this.fieldToQuery,
        searchField: this.searchField,
        searchKeyWord: this.searchKey,
        profileOrRoleId: this.profileOrRoleId ? this.profileOrRoleId : ""
      };
      fetchLookUpValues(params)
        .then((result) => {
          if (result.length === 0) {
            this.recordsList = [];
            this.message = "No Records Found";
          } else if (result && this.profileOrRoleId) {
            this.selectedRecordId = result[0].Id;
            this.selectedValue = result[0].Name;
          } else {
            this.recordsList = result;
            this.message = "";
          }
          this.error = undefined;
        })
        .catch((error) => {
          this.error = error;
          this.recordsList = undefined;
        });
    }
  }

  onSeletedRecordUpdate() {
    const passEventr = new CustomEvent("recordselection", {
      detail: {
        selectedRecordId: this.selectedRecordId,
        selectedValue: this.selectedValue,
        isActive: this.isActive,
        objectName: this.objectApiName,
        source: this.source
      }
    });
    this.dispatchEvent(passEventr);
  }
}