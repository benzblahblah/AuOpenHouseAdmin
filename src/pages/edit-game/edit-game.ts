import { Component } from '@angular/core';
import { NavController, NavParams, AlertController, LoadingController } from 'ionic-angular';
import { Loading } from 'ionic-angular/components/loading/loading';

import { Validators, FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { Game } from './../../interface/Game';

import { RestApiProvider } from './../../providers/rest-api/rest-api';

/**
 * Generated class for the EditGamePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-edit-game',
  templateUrl: 'edit-game.html',
})
export class EditGamePage {

  public game: Game;
  public deleteGameQuestion = [];

  private loader: Loading;
  
  public gameForm: FormGroup;

  public minSelectabledate;
  public maxSelectabledate;

  public listFaculties;
  public listMajors;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    private restApiProvider: RestApiProvider,
    public formBuilder: FormBuilder,
    private alertCtrl: AlertController,
    public loadingCtrl: LoadingController
  ) {
    this.game = navParams.get("game");
    console.log("Game",this.game);
  }

  ngOnInit(){
    this.getListOfFaculties();

    let d = new Date();
    this.minSelectabledate = d.getFullYear();
    this.maxSelectabledate = d.getFullYear()+1;

    this.initGame();
  }

  initGame(){
    //Change NULL to empty 
    if(this.game.Image == null){
      this.game.Image = "";
    }
    if(this.game.Location_Latitude == null){
      this.game.Location_Latitude = "";
    }
    if(this.game.Location_Longitude == null){
      this.game.Location_Longitude = "";
    }
    if(this.game.FID == null){
      this.game.FID = "-1";
    }
    if(this.game.MID == null){
      this.game.MID = "-1";
    }
    //--
    this.gameForm = this.formBuilder.group({
      GID: this.game.GID.toString(),
      Name: [this.game.Name.toString(), [Validators.required]],
      Info: [this.game.Info.toString(), [Validators.required]],
      Image: this.game.Image.toString(),
      Time_Start: [this.convertTime(this.game.Time_Start), [Validators.required]],
      Time_End: [this.convertTime(this.game.Time_End), [Validators.required]],
      State: this.game.State.toString(),
      Location_Latitude: this.game.Location_Latitude.toString(),
      Location_Longitude: this.game.Location_Longitude.toString(),
      Game_Question: this.formBuilder.array([]),
      MID: [this.game.MID.toString(), [Validators.required]],
      FID: [this.game.FID.toString(), [Validators.required]]
    });
    //set major 
    this.hintMajors(Number(this.game.FID));
    this.gameForm.patchValue({MID: this.game.MID.toString()});
    //set game question
    this.initGameQuestion();
  }

  convertTime(time: string){
    let temp = time.split(" ");
    return temp[0]+"T"+temp[1]+".000Z"
  }

  initGameQuestion(){
    this.restApiProvider.getGameQuestion(Number(this.game.GID))
    .then(result => {
      let json: any = result;
      const gameControl = <FormArray>this.gameForm.controls["Game_Question"];
      json.forEach(q => {
        let gq = this.formBuilder.group({
          QID: q.QID.toString(),
          Question: [q.Question.toString(), [Validators.required]],
          Answer_Choice: this.formBuilder.array([]),
          Right_Choice: [q.Right_Choice.toString(), [Validators.required]]
        });
        
        this.initAnswerChoice(q.QID, gq);
        
        gameControl.push(gq);
      });
    })
    .catch(error =>{
      console.log("ERROR API : getGameQuestion",error);
    })
  }

  initAnswerChoice(qid: number, gq: FormGroup){
    this.restApiProvider.getAnswerChoice(0,qid)
    .then(result => {
      let json: any = result;
      const choiceControl = <FormArray>gq.controls["Answer_Choice"];
      json.forEach(c => {
        choiceControl.push(this.formBuilder.group({
          CID: c.CID.toString(),
          Choice: [c.Choice.toString(), [Validators.required]],
        }));
      });
    })
    .catch(error =>{
      console.log("ERROR API : getAnswerChoice",error);
    })
  }

  addGameQuestion() {
    const control = <FormArray>this.gameForm.controls["Game_Question"];
    control.push(this.initNewGameQuestion());
  }

  initNewGameQuestion(){
    return this.formBuilder.group({
      Question: ["", [Validators.required]],
      Answer_Choice: this.formBuilder.array([
        this.initNewAnswerChoice(),this.initNewAnswerChoice(),this.initNewAnswerChoice(),this.initNewAnswerChoice(),
      ]),
      Right_Choice: ["", [Validators.required]]
    });
  }

  initNewAnswerChoice(){
    return this.formBuilder.group({
      Choice: ["", [Validators.required]],
    });
  }

  removeGameQuestion(i: number) {
    console.log()
    if(this.gameForm.get('Game_Question').value[i].QID){
      //if QID is exits and be removed 
      this.deleteGameQuestion.push(this.gameForm.get('Game_Question').value[i].QID);
    }
    const control = <FormArray>this.gameForm.controls["Game_Question"];
    control.removeAt(i);
  }

  submitGame(){
    let confirm = this.alertCtrl.create({
      title: "Alert!",
      message: "Are you sure that you want to edit this game?",
      enableBackdropDismiss: false,
      buttons: [{
        text: "Disagree"
      },{
        text: "Agree",
        handler: () => {
          //get form data
          let game: Game = this.gameForm.value;
          
          //Change empty to NULL
          if(game.Image == ""){
            game.Image = null;
          }
          if(game.Location_Latitude == ""){
            game.Location_Latitude = null;
          }
          if(game.Location_Longitude == ""){
            game.Location_Longitude = null;
          }
          if(game.FID == "-1"){
            game.FID = null;
          }
          if(game.MID == "-1"){
            game.MID = null;
          }
          //--
          this.presentLoading();
          //delete game question if exist in bin
          this.deleteQuestion(Number(game.GID));
          //edit game
          this.editGame(game);
        }
      }]
    });
    confirm.present();
    
  }

  deleteQuestion(gid: number){
    this.deleteGameQuestion.forEach(qid => {
      this.restApiProvider.deleteGameQuestion(gid, qid)
      .then(result => {
        console.log("delete game question success");
      })
      .catch(error =>{
        console.log("ERROR API : deleteGameQuestion",error);
      });
    });
  }

  editGame(game: Game){
    this.restApiProvider.editGame(game)
    .then(result => {
      this.loader.dismiss();
      console.log("edit game success");
      var jsonData: any = result;
      if(jsonData.isSuccess){
        this.presentAlert(jsonData.message);
        //refresth list of game on the main game page
        this.navParams.get("parentPage").getListOfGames();
        this.navCtrl.popToRoot();
      }
    })
    .catch(error =>{
      this.loader.dismiss();
      console.log("ERROR API : editGame",error);
      if(error.status == 0){
        //show error message
        this.presentAlert("Cannot connect to server");
      }else{
        var jsonData = JSON.parse(error.error);
        //show error message
        this.presentAlert(jsonData.message);
      }
    })
  }

  getListOfFaculties(){
    this.restApiProvider.getFaculties()
    .then(result => {
      this.listFaculties = result;
    })
    .catch(error =>{
      console.log("ERROR API : getFaculties",error);
    })
  }

  hintMajors(fid: number){
    this.gameForm.patchValue({MID:"-1"});
    if(fid == -1){
      this.listMajors = null;
      return;
    }
    this.restApiProvider.getMajorsInFaculty(fid)
    .then(result => {
      this.listMajors = result;
    })
    .catch(error =>{
      console.log("ERROR API : getMajorsInFaculty",error);
    })
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