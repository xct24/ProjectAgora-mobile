
import Taro, { Component, Config } from '@tarojs/taro'
import { View, Button } from '@tarojs/components'
import { connect } from '@tarojs/redux'
// import Api from '../../utils/request'
// import Tips from '../../utils/tips'
import { AuthorizeProps, AuthorizeState } from './authorize.interface'
import './authorize.scss'
import { AtButton } from 'taro-ui';
import { MAINHOST } from '../../config'
import {
    requestConfig
} from '../../config/requestConfig'
// import { } from '../../components'

@connect(({ authorize }) => ({
    ...authorize,
}))

class Authorize extends Component<AuthorizeProps,AuthorizeState > {
    config:Config = {
        navigationBarTitleText: '授权页面'
    }
    constructor(props: AuthorizeProps) {
        super(props)
        this.state = {}
    }

    async ping() {
        await this.props.dispatch({
            type:'authorize/ping'
        })
    }

    componentDidMount() {
        // Taro.login()
        // .then((res) => console.log(res))
        // .catch((failRes) => {
        //     console.log(failRes)
        // })
    }

    onGetUserInfo = (userInfo) => {
        Taro.checkSession({
            success: async () => await this.props.dispatch({
                type: "authorize/onAuthorize",
                payload: {
                    encryptedData: userInfo.detail.encryptedData,
                    iv: userInfo.detail.iv,
                }
            }),
            fail: async () => {
                const { code } = await Taro.login()
                // 请求登录
                const { data } = await Taro.request({
                    url: `${MAINHOST}${requestConfig.loginUrl}`,
                    data: { js_code: code }
                })
                if (data.unionid! === "") {
                    Taro.navigateTo({ url: "/pages/identity/identity" })
                }
                await this.props.dispatch({
                    type: "authorize/onAuthorize",
                    payload: {
                        encryptedData: userInfo.detail.encryptedData,
                        iv: userInfo.detail.iv,
                    }
                })
            }
        })
        
    }

    render() {
        return (
            <View className='authorize-wrap'>
                <AtButton customStyle={{display: Taro.getStorageSync("isAdmin") ? "block": "none"}} onClick={() => console.log(Taro.getStorageSync('token'))}>获取session_key</AtButton>
                <AtButton type="primary" openType="getUserInfo" onGetUserInfo={this.onGetUserInfo}>授权</AtButton>
                <AtButton customStyle={{display: Taro.getStorageSync("isAdmin") ? "block": "none"}} onClick={() => console.log(Taro.getUserInfo().then((res) => console.log(res)))}>获取userInfo</AtButton>
            </View>
        )
    }
    }
export default Authorize
