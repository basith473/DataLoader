public with sharing class recordCreatorClass {
  @AuraEnabled(cacheable=true)
  public static String getObjectNames() {
    try {
      List<Record_Creator__mdt> records = [
        SELECT Object_Api_Name__c
        FROM Record_Creator__mdt
      ];
      List<String> apiNames = new List<String>();
      for (Record_Creator__mdt rec : records) {
        apiNames.add(rec.Object_Api_Name__c);
      }
      if (!apiNames.isEmpty()) {
        return JSON.serialize(apiNames);
      }
      return 'Error';
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  @AuraEnabled
  public static String getObjectFields(String objectApiName){
    try {
      Map<String, String> editableFields = new Map<String, String>();
      SObject sObj = getSobject(objectApiName);
      Map<String, Schema.SObjectField> fieldsMap = sObj.getSObjectType()
        .getDescribe()
        .fields.getMap();
      for(String fieldName : fieldsMap.keySet()) {
        if(fieldsMap.get(fieldName).getDescribe().isUpdateable()) {
          editableFields.put(fieldName, fieldsMap.get(fieldName).getDescribe().getName());
        }
      }
      return JSON.serialize(editableFields);
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  @AuraEnabled(cacheable=true)
  public static String getProfileDetails() {
    try {
      Map<Id, String> profileMap = new Map<Id, String>();
      List<Profile> profileList = [SELECT id, Name FROM Profile];
      for (Profile p : profileList) {
        profileMap.put(p.Id, p.Name);
      }
      if (profileMap != null && !profileMap.isEmpty()) {
        return JSON.serialize(profileMap);
      }
      return null;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  @AuraEnabled(cacheable=true)
  public static string getRoleDetails() {
    try {
      Map<Id, String> roleMap = new Map<Id, String>();
      List<UserRole> roleList = [SELECT id, Name FROM UserRole];
      for (UserRole role : roleList) {
        roleMap.put(role.Id, role.Name);
      }
      if (roleMap != null && !roleMap.isEmpty()) {
        return JSON.serialize(roleMap);
      }
      return null;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  @AuraEnabled
  public static Map<String, String> getPermissionDetails(String userId) {
    Map<String, String> permDetails = new Map<String, String>();
    String query;
    if (userId != null) {
      query = 'SELECT Id, PermissionSetId, PermissionSet.Label FROM PermissionSetAssignment WHERE PermissionSet.IsOwnedByProfile = FALSE AND AssigneeId =: userId';
    } else {
      query = 'SELECT Id, Label FROM PermissionSet WHERE IsOwnedByProfile = FALSE';
    }

    if (userId != null) {
      List<PermissionSetAssignment> perms = Database.query(query);
      for (PermissionSetAssignment p : perms) {
        permDetails.put(p.PermissionSetId, p.PermissionSet.Label);
      }
    } else {
      List<PermissionSet> perms = Database.query(query);
      for (PermissionSet p : perms) {
        permDetails.put(p.Id, p.Label);
      }
    }
    return permDetails;
  }

  @AuraEnabled
  public static String getSelectedRecord(String objectName) {
    try {
      String query = 'SELECT Object_Field_Api_Names__c FROM Record_Creator__mdt WHERE Object_Api_Name__c =: objectName';
      Record_Creator__mdt selectedRecord = Database.query(query);
      if (selectedRecord != null) {
        List<String> fields = new List<String>();
        for (
          String str : (selectedRecord.Object_Field_Api_Names__c).split(',')
        ) {
          fields.add(str.trim());
        }
        return JSON.serialize(fields);
      }
      return null;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  @AuraEnabled
  public static String getLoadedRecords(id documentId, String objectApiName) {
    List<SObject> recordsToInsert = new List<SObject>();
    List<String> fields = new List<String>();
    Sobject obj;
    // getting File Data based on document id
    String query = 'SELECT Id, VersionData FROM ContentVersion WHERE ContentDocumentId =:documentId';
    ContentVersion cVersion = Database.query(query);
    String jsonValue;

    if (cVersion != null) {
      //split the version data
      List<String> csvRecords = cVersion.VersionData.toString().split('\n');
      fields = csvRecords[0].split(',');

      jsonValue = getFieldDetails(objectApiName, fields, null);

      if (jsonValue.contains('Field Not Found')) {
        return jsonValue;
      }

      for (Integer i = 1; i < csvRecords.size(); i++) {
        obj = getSobject(objectApiName);
        List<String> rowData = csvRecords[i].split(',');
        for (Integer j = 0; j < fields.size(); j++) {
          obj.put(fields[j].trim(), rowData[j]);
        }
        recordsToInsert.add(obj);
      }
    }

    List<FieldDetail> fieldDetail = (List<FieldDetail>) JSON.deserialize(
      jsonValue,
      List<FieldDetail>.class
    );
    RecordDetail rDetail = new RecordDetail(fieldDetail, recordsToInsert);
    return JSON.serialize(rDetail);
  }

  private static String getFieldDetails(
    String objectApiName,
    List<String> fields,
    String newField
  ) {
    SObject sObj = getSobject(objectApiName);
    Map<String, Schema.SObjectField> fieldsMap = sObj.getSObjectType()
      .getDescribe()
      .fields.getMap();

    if (fields != null && !fields.isEmpty()) {
      List<String> fieldsNotFound = new List<String>();
      List<FieldDetail> fds = new List<FieldDetail>();
      for (String col : fields) {
        if (fieldsMap.containsKey(col.trim())) {
          Schema.DescribeFieldResult dfr = fieldsMap.get(col.trim())
            .getDescribe();
          FieldDetail fd = new FieldDetail(
            dfr.getLabel(),
            dfr.getName(),
            String.valueOf(dfr.getType())
          );
          fds.add(fd);
        } else {
          fieldsNotFound.add(col.trim());
        }
      }
      if (!fieldsNotFound.isEmpty()) {
        return 'Field Not Found : ' + JSON.serialize(fieldsNotFound);
      } else if (!fds.isEmpty()) {
        return JSON.serialize(fds);
      }
    } else if (String.isNotBlank(newField)) {
      if (fieldsMap.containsKey(newField)) {
        return 'FOUND';
      }
    }
    return null;
  }

  @AuraEnabled
  public static List<Sobject> fetchLookUpValues(
    String objectApiName,
    String fieldsToQuery,
    String searchField,
    String searchKeyWord,
    String profileOrRoleId
  ) {
    objectApiName = String.escapeSingleQuotes(objectApiName); //String.escapeSingleQuotes(objectApiName);
    fieldsToQuery = String.escapeSingleQuotes(fieldsToQuery);
    searchField = String.escapeSingleQuotes(searchField);
    searchKeyWord = String.escapeSingleQuotes(searchKeyWord);

    List<sObject> returnList = new List<sObject>();
    String key = '\'%' + searchKeyWord + '%\'';
    String sQuery = '';
    System.debug('check Id -- ' + profileOrRoleId);
    //if profileOrRoleId is passed then return the pecific record else return matching records
    if (String.isNotBlank(profileOrRoleId)) {
      String recId = String.valueOf('\'' + profileOrRoleId + '\'');
      sQuery =
        'SELECT ' +
        fieldsToQuery +
        ' FROM ' +
        objectApiName +
        ' WHERE Id =' +
        recId;
    } else {
      // Create a Dynamic SOQL Query For Fetch Record List with LIMIT 6
      sQuery =
        'SELECT ' +
        fieldsToQuery +
        ' FROM ' +
        objectApiName +
        ' WHERE ' +
        searchField +
        ' LIKE ' +
        key +
        ' LIMIT 6';
    }
    try {
      return Database.query(sQuery);
    } catch (Exception e) {
      throw new AuraHandledException(
        'That didn\'n work:' +
        sQuery +
        '\n' +
        e.getMessage()
      );
    }
  }

  @AuraEnabled
  public static String getObjectNameFromId(Id recordId) {
    return recordId.getSobjectType().getDescribe().getName();
  }

  @AuraEnabled
  public static String validateField(String objectApiName, String newField) {
    if (String.isNotBlank(objectApiName) && String.isNotBlank(newField)) {
      return getFieldDetails(objectApiName, null, newField);
    }
    return null;
  }

  @AuraEnabled
  public static String getUserDetails(String userId) {
    //get Profile and Role details
    String query = 'SELECT id, name, ProfileId, Profile.Name, UserRoleId, UserRole.Name FROM User WHERE Id =: userId';
    User u = Database.query(query);
    if (u != null) {
      //get Permission set Details
      Map<String, String> permDetails = getPermissionDetails(userId);
      System.debug('check Permission Map -- ' + permDetails.size());
      UserDetails uDetails = new UserDetails(
        u.ProfileId,
        u.Profile.Name,
        u.UserRoleId,
        u.UserRole.Name,
        permDetails
      );
      return JSON.serialize(uDetails);
    }
    return null;
  }

  @AuraEnabled
  public static String saveRecords(String jsonRecords, String permDetails) {
    try {
      List<User> recordsToInsert = (List<User>) JSON.deserialize(
        jsonRecords,
        List<SObject>.class
      );

      List<PermissionClass> permissionDetails;
      Map<String, List<String>> permissionMap = new Map<String, List<String>>();

      System.debug('permDetails -- ' + permDetails);
      if(permDetails != null) {
        System.debug('before parse');
        permissionDetails = (List<PermissionClass>) JSON.deserialize(permDetails, List<PermissionClass>.class);
        System.debug('after parse');
        for(PermissionClass data : permissionDetails) {
          System.debug('Username -- ' + data.Username);
          System.debug('permissions -- ' + data.permissions);
          permissionMap.put(data.Username, data.permissions);
        } 
      }

      System.debug('check map size -- ' + permissionMap.size());
      List<ErrorDetails> errorList = new List<ErrorDetails>();
      if (!recordsToInsert.isEmpty()) {
        Database.SaveResult[] saveResult = Database.insert(
          recordsToInsert,
          false
        );

        Map<Id, List<String>> userToPermissionMap = new Map<Id, List<String>>();

        for (Integer i = 0; i < saveResult.size(); i++) {
          if (!saveResult[i].isSuccess()) {
            System.debug(saveResult[i].getErrors());
            System.debug('Inserted record -- ' + recordsToInsert[i]);
            ErrorDetails ed = new ErrorDetails();
            for (Database.Error err : saveResult[i].getErrors()) {
              ed.errorCode = err.getStatusCode();
              ed.errorMessage = err.getMessage();
            }
            ed.record = recordsToInsert[i];
            errorList.add(ed);
          } else {
            //insert permission records if present
            
            if(permissionMap.containsKey(recordsToInsert[i].Username)) {
              System.debug('inside link Map');
              userToPermissionMap.put(
                  saveResult[i].getId(), permissionMap.get(recordsToInsert[i].Username)
              );
            }
          }
        }

        if(!userToPermissionMap.isEmpty()) {
          updaterUserPermission(userToPermissionMap);
        }

        if (!errorList.isEmpty()) {
          //send email with error details
          System.debug('inside not empty');
          sendErrorEmail(errorList);
          return JSON.serialize(errorList);
        } else {
          return 'SUCCESS';
        }
      }
      return null;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  //create permissonSetAssignment record
  private static void updaterUserPermission(Map<Id, List<String>> userToPermissionMap) {
    System.debug('inside permission method');
    List<PermissionSetAssignment> permissions = new List<PermissionSetAssignment>();
    for(Id key : userToPermissionMap.keySet()) {
      System.debug('check key -- ' + key);
      for(String permissionId : userToPermissionMap.get(key)) {
        System.debug('check id -- ' + permissionId);
        permissions.add(new PermissionSetAssignment(
          AssigneeId = key,
          PermissionSetId = Id.valueOf(permissionId)
        ));
        System.debug('check after loop');
      }
    }
    System.debug('check last -- ' + permissions.size());
    if(!permissions.isEmpty()){
      System.debug('check inside permission insert -- ');
      Database.SaveResult[] saveResult = Database.insert(permissions, false);
      for(Database.SaveResult sr : saveResult) {
        if(sr.isSuccess()) {
          System.debug('inserted');
        } else {
          for (Database.Error err : sr.getErrors()) {
            System.debug('error -- ' + err.getMessage());
          }
        }
      }
    }
  }

  private static void sendErrorEmail(List<ErrorDetails> errorList) {
    System.debug('inside send email');
    //send email
    Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
    mail.setToAddresses(new List<String> {UserInfo.getUserEmail()});
    mail.setSubject('Failed to create the User Records');
    String body = 'Hi ' + UserInfo.getName() + ', <br/>';
    body += 'Please find the following errors occured while creating the User <br/><br/>';

    for(ErrorDetails err : errorList) {
      body += err.errorMessage + '<br/>';
    }

    mail.setHtmlBody(body);
    Messaging.sendEmail(new List<Messaging.SingleEmailMessage> {mail});
  }

  private static SObject getSobject(String objectApiName) {
    SObject sObj = (SObject) (Type.forName('Schema.' + objectApiName)
      .newInstance());
    return sObj;
  }

  //Enhancement
  public class RecordDetail {
    @AuraEnabled
    public List<FieldDetail> columns { get; set; }
    @AuraEnabled
    public List<SObject> records { get; set; }

    public RecordDetail(List<FieldDetail> columns, List<SObject> records) {
      this.columns = columns;
      this.records = records;
    }
  }

  public class FieldDetail {
    @AuraEnabled
    public String label { get; set; }
    @AuraEnabled
    public String fieldName { get; set; }
    @AuraEnabled
    public String type { get; set; }
    public FieldDetail(String label, String fieldName, String type) {
      this.label = label;
      this.fieldName = fieldName;
      this.type = type;
    }
  }

  public class ErrorDetails {
    @AuraEnabled
    public StatusCode errorCode { get; set; }
    @AuraEnabled
    public string errorMessage { get; set; }
    @AuraEnabled
    public SObject record { get; set; }
  }

  public class PermissionClass {
    @AuraEnabled
    public String Username {get; set;}
    @AuraEnabled
    public List<String> permissions {get; set;}
  }

  public class UserDetails {
    @AuraEnabled
    public String profileId { get; set; }
    @AuraEnabled
    public String profileName { get; set; }
    @AuraEnabled
    public String roleId { get; set; }
    @AuraEnabled
    public String roleName { get; set; }
    @AuraEnabled
    public Map<String, String> permissionSetDetails { get; set; }

    public UserDetails(
      String profileId,
      String profileName,
      String roleId,
      String roleName,
      Map<String, String> permissionSetDetails
    ) {
      this.profileId = profileId;
      this.profileName = profileName;
      this.roleId = roleId;
      this.roleName = roleName;
      this.permissionSetDetails = permissionSetDetails;
    }
  }
}