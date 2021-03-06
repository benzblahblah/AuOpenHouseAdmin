import { Component } from '@angular/core';
import { NavController, NavParams, AlertController, LoadingController } from 'ionic-angular'
import { Loading } from 'ionic-angular/components/loading/loading';

import { RestApiProvider } from './../../providers/rest-api/rest-api';

/**
 * Generated class for the AdminAccountApprovalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-admin-account-approval',
  templateUrl: 'admin-account-approval.html',
})
export class AdminAccountApprovalPage {

  private loader: Loading;

  public authorities = [];
  public faculties = [];

  public rawListOfAuthorities;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private restApiProvider: RestApiProvider,
    private alertCtrl: AlertController,
    public loadingCtrl: LoadingController
  ) {
  }

  ngOnInit(){
    this.getListOfAuthorities();
  }

  doRefresh(refresher) {
    this.restApiProvider.getAuthorities(0)
    .then(result => {
      this.rawListOfAuthorities = result;
      this.faculties = Object.keys(this.groupByFaculty(result));
      this.authorities = this.groupByFaculty(result);
      refresher.complete();
    })
    .catch(error =>{
      console.log("ERROR API : getAuthorities",error);
      refresher.complete();
    })
  }

  getListOfAuthorities(){
    this.presentLoading();
    this.restApiProvider.getAuthorities(0)
    .then(result => {
      this.loader.dismiss();
      this.rawListOfAuthorities = result;
      this.faculties = Object.keys(this.groupByFaculty(result));
      this.authorities = this.groupByFaculty(result);
    })
    .catch(error =>{
      this.loader.dismiss();
      console.log("ERROR API : getAuthorities",error);
    })
  }

  groupByFaculty(facultyValues){
    return facultyValues.reduce((groups, facultyed) => {
      let key = "All";
      if(facultyed.Faculty_Name){
        key = facultyed.Faculty_Name;
      }
      if (groups[key]) {
        groups[key].push(facultyed);
      } else {
        groups[key] = [facultyed];
      }
      return groups;
    }, {});
  }

  authorityBan(aid: string){
    console.log("authorityBan",aid);
    let confirm = this.alertCtrl.create({
      title: "Alert!",
      message: "Are you sure that you want to ban this user?",
      enableBackdropDismiss: false,
      buttons: [{
        text: "Disagree"
      },{
        text: "Agree",
        handler: () => {
          this.manageAuthority(aid,-1);
        }
      }]
    });
    confirm.present();
  }

  authorityApprove(aid: string){
    console.log("authorityApprove",aid);
    let confirm = this.alertCtrl.create({
      title: "Alert!",
      message: "Are you sure that you want to approve this user?",
      enableBackdropDismiss: false,
      buttons: [{
        text: "Disagree"
      },{
        text: "Agree",
        handler: () => {
          this.manageAuthority(aid,1);
        }
      }]
    });
    confirm.present();
  }

  manageAuthority(aid: string, code: number){
    // -1 = ban
    // 0 = waiting
    // 1 = approved
    var authority = {
      AID: aid,
      Accout_Approval: code
    }

    this.presentLoading();
    this.restApiProvider.editAuthority(authority)
    .then(result => {
      console.log("edit authority success");
      this.loader.dismiss();
      this.getListOfAuthorities();
      var jsonData: any = result;
      if(jsonData.isSuccess){
        this.presentAlert(jsonData.message);
      }
    })
    .catch(error =>{
      this.loader.dismiss();
      console.log("ERROR API : editAuthority",error);
      if(error.status == 0){
        //show error message
        this.presentAlert("Cannot connect to server");
      }else{
        var jsonData = JSON.parse(error.error);
        //show error message
        this.presentAlert(jsonData.message);
      }
    });
  }

  presentAlert(message) {
    let alert = this.alertCtrl.create({
      title: 'Alert!',
      subTitle: message,
      enableBackdropDismiss: false,
      buttons: [{
        text: 'Ok'
      }]
    });
    alert.present();
  }

  presentLoading() {
    this.loader = this.loadingCtrl.create({
      content: "Please wait..."
    });
    this.loader.present();
  }

}
