import { api, LightningElement } from 'lwc';
import validateField from "@salesforce/apex/recordCreatorClass.validateField";
import { showToast, getObjectFields } from 'c/customUtility';

export default class DownloadComponent extends LightningElement {
    @api objectOptions;

    pillColumns = [];
    columns = [];

    selectedDownloadObject;

    isLoading = false;
    showHeader = false;
    isDisabled = true;

    handleChange(event) {
        this.isLoading = true;
        new Promise((resolve, reject) => {
          setTimeout(() => {
            this.getDownloadObjectFields(event);
            resolve();
          }, 0);
          // eslint-disable-next-line no-return-assign
        }).then(() => (this.isLoading = false));
    }

    getDownloadObjectFields(event) {
        this.pillColumns = [];
        this.columns = [];
        this.selectedDownloadObject = event.detail.value;
        if (this.selectedDownloadObject) {
            getObjectFields(this.selectedDownloadObject)
            .then((result) => {
              this.columns = result;
              this.columns.forEach((col) => {
                this.pillColumns = [...this.pillColumns, { label: col }];
              });
            })
            .catch((err) => {
              console.log(err);
            });
          this.showHeader = true;
          this.isDisabled = false;
        } else {
          this.isDisabled = true;
        }
    }

    addNewField() {
        let newField = this.template.querySelector("[data-id=addNewField]");
    
        if (!this.columns.includes(newField.value.trim())) {
          //Validate field
          let param = {
            objectApiName: this.selectedDownloadObject,
            newField: newField.value.trim()
          };
    
          validateField(param).then((result) => {
            if (result === "FOUND") {
              this.columns = [...this.columns, newField.value.trim()];
              this.pillColumns = [
                ...this.pillColumns,
                { label: newField.value.trim() }
              ];
              this.template.querySelector("[data-id=addNewField]").value = "";
              if (this.isDisabled) {
                this.isDisabled = false;
              }
            } else {
                this.dispatchEvent(
                    showToast('Error', 'Please enter valid Field API', 'error')
                );
            }
          });
        } else {
            this.dispatchEvent(
                showToast('Error', 'Field already exists', 'error')
            );
        }
    }

    handleRemoveColumns(event) {
        const index = event.detail.name;
        const _items = this.pillColumns;
    
        if (index > -1) {
          _items.splice(index, 1);
          this.pillColumns = [..._items];
          this.columns = [...this.pillColumns];
        }
        if (this.pillColumns.length < 1) {
          this.isDisabled = true;
        }
    }

    downloadCSV() {
        this.createCSV();
    }

    createCSV() {
        let csvString = "";
        let csvSeperator = ",";
    
        csvString += this.columns.join(csvSeperator);
    
        // Creating anchor element to download
        let downloadElement = document.createElement("a");
        // This  encodeURI encodes special characters, except: , / ? : @ & = + $ # (Use encodeURIComponent() to encode these characters).
        downloadElement.href =
          "data:text/csv;charset=utf-8," + encodeURI(csvString);
        downloadElement.target = "_self";
        downloadElement.download = this.selectedDownloadObject + " Data.csv";
    
        // required if using firefox browser
        document.body.appendChild(downloadElement);
    
        downloadElement.click();
    }
}