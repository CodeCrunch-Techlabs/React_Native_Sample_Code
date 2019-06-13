import React, { Component } from 'react';
import {
    TextInput, Alert, ActivityIndicator, View, Text, Button,
    Image, TouchableHighlight, Dimensions, StyleSheet, Platform
} from 'react-native';
//Libraries
import { Navigation } from 'react-native-navigation';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { connect } from 'react-redux';
import DeviceInfo from 'react-native-device-info';
//Redux-Actions
import { addUserInfo, addUserAuthorization } from "../config/redux.store/actions/index";
//Import-Component and Other
import commonStyles from '../styles/common.style';
import LoaderComponent from '../components/loader.component';
import stackName from '../constants/stack.name.enum';
import screenId from '../constants/screen.id.enum';
import commonConstant from '../constants/common.constant';
import AuthInterface from '../interfaces/auth.interface';
import fontFamilyStyles from '../styles/font.style';
import NavigationUtil from '../utils/navigation.util';
import stringConstant from '../constants/string.constant';
import AsyncStorageUtil from '../utils/asyncstorage.util';
import commonUtil from '../utils/common.util';
//Model
import CommonModal from '../components/common.modal';
import UserRequestModel from '../models/user.request.model';
import httpResponseModel from '../models/httpresponse.model';
import UserResponseModel from '../models/user.response.model';
import UserRegistrationResponseModel from '../models/userregistration.model';
import ModalComponentModel from '../models/modal.component.model';
import G_ResponseModel from '../models/g.response.model';
import UserAuthenticationModel from '../models/user.authentication.model';
import commonTheme from '../Documents/ReactNative_Projects/Invest/src/themes/common.theme';

//Define-Constant
const widthScr = Dimensions.get('window').width;
const heightScr = Dimensions.get('window').height;

class LoginScreen extends Component {

    constructor(props) {
        super(props);
        Navigation.events().bindComponent(this);

        this.state = {
            showActivityIndicator: false,
            userName: "",
            password: "",
            enableLoginBtn: true,
            modalComponent: {}
        };
        /**
        * Global Variables for API Call
        */
        global.CLIENT_USER_AGENT = "Android 6.0.1";
        global.CLIENT_IP_ADDRESS = "192.160.1.1";
        global.CLIENT_DEVICE_SERIAL_NUMBER = "999999999999999";
        global.CULTURE_NAME = "en";

        this.leftButtonClicked = this.leftButtonClicked.bind(this);
        this.rightButtonClicked = this.rightButtonClicked.bind(this);
    }

    /**
     * Display custom Popup Modal
     */
    initializeModalComponent = () => {
        let initialModalComponent = new ModalComponentModel();
        initialModalComponent.shouldVisible = false;
        this.setState({
            modalComponent: initialModalComponent
        })
    }

    componentWillMount() {
        this.initializeModalComponent();
        /**
        * Set Global Variable Values
        */
        global.CLIENT_USER_AGENT = DeviceInfo.getUserAgent();
        global.CLIENT_DEVICE_SERIAL_NUMBER = DeviceInfo.getUniqueID();
        DeviceInfo.getIPAddress().then(ip => {
            global.CLIENT_IP_ADDRESS = ip;
        });
    }

    componentDidMount() {
        AsyncStorageUtil.getItem(stringConstant.LANGUAGE_CODE).then((value) => {
            var lang_code = "";
            if (value == null) {
                lang_code = 'en';
            } else {
                lang_code = value;
            }
            AsyncStorageUtil.storeStringItem(stringConstant.LANGUAGE_CODE, lang_code);
            global.CULTURE_NAME = lang_code;
        })
    }

    /**
     * Custom Alert Popup View Left Button Click Event
     */
    leftButtonClicked = () => {
        this.showCustomAlert(false);
    }

    /**
     * Custom Alert Popup View Right Button Click Event
     */
    rightButtonClicked = () => {
        this.showCustomAlert(false);
    }

    /**
     * Custom Alert Popup View Close Button Click Event
     */
    closeButtonClicked = () => {
        this.showCustomAlert(false);
    }

    /**
     * Display Custom Alert Popup View Function
     */
    showCustomAlert = (visible, message) => {
        this.setState({
            modalComponent: commonUtil.setAlertComponent(visible, message, 'Okay', "", true, false, () => this.leftButtonClicked(), () => this.rightButtonClicked(), () => this.closeButtonClicked())
        });
    }

    /**
     * Display Activity Loader Function
     */
    showLoader = (bit) => { // call this function to show/hide the loader
        this.setState({
            showActivityIndicator: bit
        });
    }

    /**
     * Signup Now Button Click Event
     */
    signUpButtonPressed = () => {
        Navigation.push(stackName.AuthenticationStack, {
            component: {
                name: screenId.SignUpScreen,
            }
        });
    }

    /**
     * Login Button Click Event
     */
    onLoginButtonPressed = () => {
        if (!commonConstant.EMAIL_REGEX.test(this.state.userName)) {
            this.showCustomAlert(true, 'Please Enter Valid Email'))
        } else {
            let userInfoModel = new UserRequestModel();
            userInfoModel.Username = this.state.userName;
            userInfoModel.Password = this.state.password;
            userInfoModel.ClientUserAgent = global.CLIENT_USER_AGENT;
            userInfoModel.ClientApplicationType = commonConstant.CLIENT_APPLICATION_TYPE;
            userInfoModel.ClientIPAddress = global.CLIENT_IP_ADDRESS;
            userInfoModel.ClientDeviceSerialNumber = global.CLIENT_DEVICE_SERIAL_NUMBER;
            userInfoModel.CultureName = global.CULTURE_NAME;
            userInfoModel.ReturnInstrumentationDetails = commonConstant.RETURN_INSTRUMENTATION_DETAILS;
            this.showLoader(true);
            console.log("User/AuthAndGetUserInfo Request:-" + JSON.stringify(userInfoModel));

            AuthInterface.authAndGetUserInfo(userInfoModel).then((response) => {
                var res = new httpResponseModel();
                res = response;
                console.log("User/AuthAndGetUserInfo Response:-" + JSON.stringify(res));
                if (res.ErrorCode == commonConstant.SUCCESS_CODE) {
                    let userResponseModel = new UserResponseModel();
                    userResponseModel = res.Result.User;
                    this.props.addUserInfo(userResponseModel);

                    let userRegistrationModel = new UserRegistrationResponseModel();
                    userRegistrationModel = res.Result.UserSignupRegistrationInfo;

                    let tempDashboardModel = new G_ResponseModel();
                    tempDashboardModel = res.Result.Dashboard;

                    let tempUserAuthenticationModel = new UserAuthenticationModel();
                    tempUserAuthenticationModel = res.Result.AuthenticationToken;
                    this.props.addUserAuthorization(tempUserAuthenticationModel);

                    AsyncStorageUtil.storeItem(stringConstant.SAVE_USER_INFO, res.Result).then((success) => {
                        this.verifyIncompleteOnboarding(userRegistrationModel, tempDashboardModel, userResponseModel);
                    });

                } else if (res.ErrorCode == "2") {
                    this.showCustomAlert(true, 'Login password does not match');
                }
                else {
                    this.showCustomAlert(true, res.ErrorMsg);
                }
                this.showLoader(false);
            }, (err) => {
                this.showLoader(false);
                this.showCustomAlert(true, 'API Failed');
            });
        }
    }

    /**
     * Check Registration Process
     */
    verifyIncompleteOnboarding = (uRModel, gModel, authModel) => {
        if (uRModel.PhoneCountryCodeSignupSupported == "F") {
            Navigation.setStackRoot(stackName.AuthenticationStack, {
                component: {
                    name: screenId.CountryNotSupportedScreen
                }
            });

        } else if (uRModel.MobilePhoneVerified == false) {
            Navigation.setStackRoot(stackName.AuthenticationStack, {
                component: {
                    name: screenId.AddMobileNumberScreen,
                }
            });

        } else if (uRModel.TermsAndConditionsAccepted == false) {
            Navigation.setStackRoot(stackName.AuthenticationStack, {
                component: {
                    name: screenId.TermsAndConditionsScreen
                }
            });

        } else if (gModel.GID === null) {
            NavigationUtil.setDefaultOptions();
            NavigationUtil.setBottomTabsFor_G();

        } else if (authModel.CountryName === null) {
            NavigationUtil.setDefaultOptions();
            NavigationUtil.confirmYourEntry();

        } else {
            NavigationUtil.setDynamicBottomTabsFor_G(screenId.GScreen, gModel);
        }
    }

    /**
     * Forgot Password Button Click Event
     */
    onForgotPasswordButtonClicked = () => {
        Navigation.push(stackName.AuthenticationStack, {
            component: {
                name: screenId.ForgotPasswordScreen,
            }
        });
    }

    /**
     * TextInput Focus Event
     */
    focusNextInputField = (nextField) => {
        this.refs[nextField].focus();
    }

    /**
     * Check TextFields Values and Enable/Disable Login Button
     */
    checkIfFieldsAreNotEmpty = (type, value) => {
        if (type == "userName") {
            this.setState({
                userName: value
            }, () => {
                if (this.state.userName.length >= 6) {
                    this.changeLoginBtnState();
                } else {
                    this.setState({
                        enableLoginBtn: false
                    });
                }
            });
        }
        if (type == "password") {
            this.setState({
                password: value
            }, () => {
                this.changeLoginBtnState();
            });
        }
    }

    changeLoginBtnState = () => {
        if (this.state.userName && this.state.userName.length >= 6 && this.state.password) {
            this.setState({
                enableLoginBtn: true
            });
        } else {
            this.setState({
                enableLoginBtn: false
            });
        }
    }

    /**
     * Render Method
     */
    render() {
        return (
            <KeyboardAwareScrollView enableOnAndroid={true} showsVerticalScrollIndicator={false}>
                <View style={styles.container}>
                    <Text style={[styles.header, styles.reducedHeaderMargin]}>Login</Text>
                    <Image style={styles.logo} source={require("../assets/Logo.png")} />

                    <View style={styles.formView}>

                        <View style={styles.elementBox1}>
                            <Text style={styles.headerLabel}>Email</Text>
                            <View style={[styles.inputFieldCoverView, styles.authInputFieldBottomBorder]}>
                                <Image style={styles.icon} source={require("../assets/email.png")} />
                                <TextInput
                                    ref='0'
                                    value={this.state.userName}
                                    maxLength={commonConstant.MAX_CHARACTER_EMAIL}
                                    style={styles.textInputView}
                                    placeholder="Email Address"
                                    returnKeyType='next'
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    onSubmitEditing={() => this.focusNextInputField('1')}
                                    onChangeText={(userName) => this.checkIfFieldsAreNotEmpty('userName', userName)}
                                />
                            </View>
                        </View>

                        <View style={styles.elementBox2}>
                            <Text style={styles.headerLabel}>Password</Text>
                            <View style={[styles.inputFieldCoverView, styles.authInputFieldBottomBorder]}>
                                <Image style={styles.icon} source={require("../assets/password.png")} />
                                <TextInput
                                    ref='1'
                                    maxLength={commonConstant.MAX_CHARACTER_PASSWORD}
                                    value={this.state.password}
                                    style={styles.textInputView}
                                    placeholder="Password"
                                    returnKeyType='default'
                                    autoCapitalize="none"
                                    secureTextEntry={true}
                                    onChangeText={(password) => this.checkIfFieldsAreNotEmpty('password', password)}
                                />
                            </View>
                        </View>

                        <View style={styles.elementBox3}>
                            <TouchableHighlight
                                style={styles.fullWidth}
                                onPress={this.onLoginButtonPressed}
                                disabled={!this.state.enableLoginBtn}
                                underlayColor="white">
                                <View
                                    style={
                                        [
                                            this.state.enableLoginBtn ? styles.primaryYellowButton : styles.primaryDisableButton,
                                            styles.buttonRadius
                                        ]
                                    }>
                                    <Text
                                        style={
                                            [styles.buttonTextWhite, fontFamilyStyles.robotoRegular,
                                            this.state.enableLoginBtn ? commonStyles.secTextColor : styles.disabledTextColor,
                                            ]
                                        }>
                                        Login
                                            </Text>
                                </View>
                            </TouchableHighlight>
                        </View>

                    </View>

                    <TouchableHighlight style={{ alignItems: 'center' }} onPress={this.onForgotPasswordButtonClicked} underlayColor="white">
                        <View style={styles.secondaryTransparentButton}>
                            <Text style={styles.buttonTextYellow}>Forgot Password?</Text>
                        </View>
                    </TouchableHighlight>

                    <View style={styles.signupView}>
                        <Text style={styles.signupLabel}>Don't have an account? </Text>
                        <TouchableHighlight style={{ alignItems: 'center' }} onPress={this.signUpButtonPressed} underlayColor="transparent">
                            <View style={styles.secondaryTransparentButton}>
                                <Text style={styles.buttonTextBlue}>Sign Up Now!</Text>
                            </View>
                        </TouchableHighlight>
                    </View>

                </View>
                <LoaderComponent showLoader={this.state.showActivityIndicator} />
                <CommonModal modalComponent={this.state.modalComponent} />
            </KeyboardAwareScrollView>
        );
    }
}

/**
* Stylesheet Styles of Screen
*/
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        color: 'black'
    },
    header: {
        fontSize: commonTheme.FONT_SIZE_LARGE,
        fontFamily: commonTheme.ROBOTO_LIGHT,
        color: commonTheme.PRIMARY_TEXT_COLOR_LIGHT,
        textAlign: 'center',
        margin: 8,
        marginTop: 60
    },
    reducedHeaderMargin: {
        marginTop: Platform.OS === 'android' ? 20 : 35
    },
    logo: {
        height: 100,
        width: 100,
        marginBottom: 8
    },
    formView: {
        width: '80%',
        height: 280,
        justifyContent: 'space-between'
    },
    elementBox1: {
        flex: 3,
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
    },
    headerLabel: {
        fontSize: commonTheme.FONT_SIZE_MEDIUM,
        fontFamily: commonTheme.ROBOTO_LIGHT,
        textAlign: 'center',
        color: commonTheme.PRIMARY_TEXT_COLOR_LIGHT
    },
    inputFieldCoverView: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 5,
        width: '100%',
        height: 46
    },
    authInputFieldBottomBorder: {
        borderBottomWidth: 1,
        borderColor: commonTheme.INPUT_FIELD_BORDER_COLOR
    },
    icon: {
        flex: 1,
        height: 24,
        paddingRight: 5,
        resizeMode: 'contain'
    },
    textInputView: {
        height: '100%',
        marginLeft: 0,
        fontSize: commonTheme.FONT_SIZE_INPUT_FIELD,
        flex: 9,
        paddingLeft: 5,
        fontFamily: commonTheme.ROBOTO_LIGHT
    },
    elementBox2: {
        flex: 3,
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
    },
    elementBox3: {
        flex: 2,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    fullWidth: {
        width: '100%'
    },
    primaryYellowButton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: commonTheme.SECONDARY_BTN_BACKGROUND_COLOR,
        height: 50,
        color: 'white',
        fontSize: 22
    },
    primaryDisableButton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: commonTheme.DISABLED_BTN_BACKGROUND_COLOR,
        height: 50,
        color: 'white',
        fontSize: 22
    },
    buttonTextWhite: {
        color: 'white',
        fontSize: 22,
    },
    disabledTextColor: {
        color: commonTheme.COLOR_989898
    },
    secondaryTransparentButton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
    },
    buttonTextYellow: {
        color: commonTheme.SECONDARY_BTN_BACKGROUND_COLOR,
        fontFamily: commonTheme.ROBOTO_LIGHT,
        fontSize: 18,
        textDecorationLine: 'underline'
    },
    signupView: {
        width: '90%',
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        flex: 1,
        marginBottom: 20,
        marginTop: 9,
    },
    signupLabel: {
        fontSize: 18,
        fontFamily: commonTheme.ROBOTO_LIGHT,
        textAlign: 'center',
        color: 'black'
    },
    buttonTextBlue: {
        color: commonTheme.PRIMARY_BTN_BACKGROUND_COLOR,
        fontFamily: commonTheme.ROBOTO_REGULAR,
        fontSize: 18,
        textDecorationLine: 'underline'
    },
})

const mapStateToProps = state => {
    return {
        UserResponseModel: state.userInfoReducer.userResponse,
        gResponse: state.DashboardReducer.gResponse,
        userAuthorizationResponse: state.userAuthorizationReducer.userAuthorizationResponse
    };
}

const mapDispatchToProps = dispatch => {
    return {
        addUserInfo: (UserResponseModel) => dispatch(addUserInfo(UserResponseModel)),
        addUserAuthorization: (userAuthorizationResponse) => dispatch(addUserAuthorization(userAuthorizationResponse))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(LoginScreen);
