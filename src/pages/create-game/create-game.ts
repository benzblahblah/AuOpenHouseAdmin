import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, NavParams, AlertController, LoadingController } from 'ionic-angular';
import { Loading } from 'ionic-angular/components/loading/loading';

import { Validators, FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { Game } from './../../interface/Game';

import { RestApiProvider } from './../../providers/rest-api/rest-api';

import firebase from 'firebase';
import {} from '@types/googlemaps';

/**
 * Generated class for the CreateGamePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-create-game',
  templateUrl: 'create-game.html',
})
export class CreateGamePage {

  @ViewChild("map") mapRef: ElementRef;
  private map: google.maps.Map;
  private gameMapMarker: google.maps.Marker;

  private loader: Loading;
  
  public gameForm: FormGroup;

  public minSelectabledate;
  public maxSelectabledate;

  public listFaculties;
  public listMajors;

  public storage = firebase.storage();
  
  public ImageOrientation: number;
  public Image: string;
  public gotImage: boolean = false;
  

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    private restApiProvider: RestApiProvider,
    public formBuilder: FormBuilder,
    private alertCtrl: AlertController,
    public loadingCtrl: LoadingController
  ) {
  }

  ngOnInit(){
    this.showMap();
    this.getListOfFaculties();

    let d = new Date();
    this.minSelectabledate = d.getFullYear();
    this.maxSelectabledate = d.getFullYear()+1;

    this.initGame();
  }

  showMap(){
    //set default map location
    const location = new google.maps.LatLng(13.612111, 100.837667);
    //set map options
    const options = {
      center: location,
      zoom: 17
    };

    this.map = new google.maps.Map(this.mapRef.nativeElement,options);

    google.maps.event.addListener(this.map, 'click', event => {
      this.placeMarker(event.latLng, this.map);
    });
  }

  placeMarker(location, map){
    if(this.gameMapMarker){
      this.gameMapMarker.setPosition(location);
    }else{
      this.gameMapMarker = new google.maps.Marker({
        position: location,
        draggable: true,
        map: map
      });
    }
  }

  initGame(){
    this.gameForm = this.formBuilder.group({
      Name: ["", [Validators.required]],
      Info: ["", [Validators.required]],
      Image: "",
      State: ["1", [Validators.required]],
      Time_Start: ["", [Validators.required]],
      Time_End: ["", [Validators.required]],
      Location_Latitude: "",
      Location_Longitude: "",
      Game_Question: this.formBuilder.array([
        this.initGameQuestion(),
      ]),
      MID: ["-1", [Validators.required]],
      FID: ["-1", [Validators.required]]
    });
  }

  initGameQuestion(){
    return this.formBuilder.group({
      Question: ["", [Validators.required]],
      Answer_Choice: this.formBuilder.array([
        this.initAnswerChoice(),this.initAnswerChoice(),this.initAnswerChoice(),this.initAnswerChoice(),
      ]),
      Right_Choice: ["", [Validators.required]]
    });
  }

  initAnswerChoice(){
    return this.formBuilder.group({
      Choice: ["", [Validators.required]],
    });
  }

  addGameQuestion() {
    const control = <FormArray>this.gameForm.controls["Game_Question"];
    control.push(this.initGameQuestion());
  }

  removeGameQuestion(i: number) {
    const control = <FormArray>this.gameForm.controls["Game_Question"];
    control.removeAt(i);
  }

  submitGame(){
    let confirm = this.alertCtrl.create({
      title: "Alert!",
      message: "Are you sure that you want to create this game?",
      enableBackdropDismiss: false,
      buttons: [{
        text: "Disagree"
      },{
        text: "Agree",
        handler: () => {
         this.addGame();
        }
      }]
    });
    confirm.present();
  }

  addGame(){
    //get form data
    let game: Game = this.gameForm.value;
    
    //Change empty to NULL
    if(game.Image == ""){
      game.Image = null;
    }
    //get location from google map
    if(this.gameMapMarker){
      game.Location_Latitude = this.gameMapMarker.getPosition().lat().toString();
      game.Location_Longitude = this.gameMapMarker.getPosition().lng().toString();
    }else{
      game.Location_Latitude = null;
      game.Location_Longitude = null;
    }
    if(game.FID == "-1"){
      game.FID = null;
    }
    if(game.MID == "-1"){
      game.MID = null;
    }
    //*
    this.presentLoading();
    this.restApiProvider.addGame(game)
    .then(result => {
      this.loader.dismiss();
      console.log("add game success");
      var jsonData: any = result;
      if(jsonData.isSuccess){
        this.presentAlert(jsonData.message);
        //refresth list of game on the main game page
        this.navParams.get("parentPage").getListOfGames();
        this.navCtrl.pop();
      }
    })
    .catch(error =>{
      this.loader.dismiss();
      console.log("ERROR API : addGame",error);
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

  resetImage(){
    this.ImageOrientation = null;
    this.Image = null;
    this.gotImage = false;
  }

  removeImage(){
    this.gameForm.patchValue({Image: ""})
    this.resetImage();
    console.log("remove image");
  }

  uploadImage(event){
    //reset first
    this.resetImage();

    let pic = event.target.files[0];
    if(pic == null || pic.type!="image/jpeg"){
      console.log("image not in jpeg");
      return;
    }
    //GET orientation
    this.orientationReader(pic);
    //RESET picture orientation
    this.resetOrientationPhoto(pic);
  }

  orientationReader(picture){
    var reader = new FileReader();
    reader.onload = this._handleOrientationLoaded.bind(this);
    reader.readAsArrayBuffer(picture);
  }

  _handleOrientationLoaded(readerEvt){
    var view = new DataView(readerEvt.target.result);
    if (view.getUint16(0, false) != 0xFFD8){
      console.log("Error Picture not jped");
      return -2;
    }
    var length = view.byteLength, offset = 2;
    while (offset < length) {
      var marker = view.getUint16(offset, false);
      offset += 2;
      if (marker == 0xFFE1) {
        if (view.getUint32(offset += 2, false) != 0x45786966){
          console.log("Error Picture not defined");
          return -1;
        } 
        var little = view.getUint16(offset += 6, false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        var tags = view.getUint16(offset, little);
        offset += 2;
        for (var i = 0; i < tags; i++)
          if (view.getUint16(offset + (i * 12), little) == 0x0112){
            let orientation = view.getUint16(offset + (i * 12) + 8, little);
            console.log("Picture orientation",orientation);
            this.ImageOrientation = orientation;
            return orientation;
          }
      }
      else if ((marker & 0xFF00) != 0xFF00) break;
      else offset += view.getUint16(offset, false);
    }
  }

  resetOrientationPhoto(picture){
    var img = new Image();
    img.onload = this._handleResetOrientationPhotoLoaded.bind(this);
    img.src = URL.createObjectURL(picture);
  }

  _handleResetOrientationPhotoLoaded(readerEvt){
    var img = readerEvt.path[0];
    var width = img.width,
    height = img.height,
    canvas = document.createElement('canvas'),
    ctx = canvas.getContext("2d");

     if (4 < this.ImageOrientation && this.ImageOrientation < 9) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    switch (this.ImageOrientation) {
      case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, width, height ); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, height ); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, height , 0); break;
      case 7: ctx.transform(0, -1, -1, 0, height , width); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
      default: break;
    }

    ctx.drawImage(img, 0, 0);

    //export to base64 jpeg and set image quality  25%
    let imageData = canvas.toDataURL("image/jpeg",0.25);

    this.Image = imageData;
    console.log("Got Image");
    this.gotImage = true;
    this.uploadImageToFirestore();
  }

  uploadImageToFirestore(){
    if(this.gotImage==false){
      console.log("no image to upload");
      return;
    }
    this.presentLoading();
    let photoPath = "Images/Events/"+new Date().getTime()+".jpg";
    const storageRef = this.storage.ref(photoPath);
    storageRef.putString(this.Image, "data_url")
    .then(() =>{
      console.log("Uploaded image");
    })
    .then(() => {
      //get image URL
      const storageRef = this.storage.ref(photoPath);
      storageRef.getDownloadURL()
      .then(url =>{
        this.gameForm.patchValue({Image: url})
        console.log("Got image URL", url);
        this.loader.dismiss();
      });
    })
    .catch(error => {
      this.loader.dismiss();
      console.log("Error",error);
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
