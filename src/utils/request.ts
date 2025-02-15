import Taro, { Component } from '@tarojs/taro'
import {
    ISMOCK,
    MAINHOST
} from '../config'
import {
    commonParams,
    requestConfig
} from '../config/requestConfig'
import Tips from './tips'

// import { createLogger } from './logger'

declare type Methods = "GET" | "OPTIONS" | "HEAD" | "POST" | "PUT" | "DELETE" | "TRACE" | "CONNECT";
declare type Headers = { [key: string]: string };
declare type Datas = { method: Methods;[key: string]: any; };
interface Options {
    url: string;
    host?: string;
    method?: Methods;
    data?: Datas;
    header?: Headers;
}

export class Request {
    //登陆的promise
    static loginReadyPromise: Promise<any> = Promise.resolve()
    // 正在登陆
    static isLogining: boolean = false
    // 导出的api对象
    static apiLists: { [key: string]: () => any; } = {}
    // token
    static token: string = ''

    // constructor(setting) {

    // }
    /**
     * @static 处理options
     * @param {Options | string} opts
     * @param {Datas} data
     * @returns {Options}
     * @memberof Request
     */
    static combineOptions(opts, data: Datas, method: Methods): Options {
        typeof opts === 'string' && (opts = { url: opts })
        console.log("lalala", {
            data: { ...commonParams, ...opts.data, ...data },
            method: opts.method || data.method || method || 'GET',
            url: `${opts.host || MAINHOST}${opts.url}`
        }, "opts", opts, "data", data) 
        return {
            data: { ...commonParams, ...opts.data, ...data },
            method: opts.method || data.method || method || 'GET',
            url: `${opts.host || MAINHOST}${opts.url}`
        }
    }

    static getToken() {
        !this.token && (this.token = Taro.getStorageSync('token'))
        return this.token
    }

    /**
     * 
     * @static request请求 基于 Taro.request
     * @param {Options} opts 
     */
    static async request(opts: Options) {
        // token不存在或learnerFullName不存在
        if (!this.getToken()){
            await this.login()
        }

        // token存在
        Object.assign(opts, { header: { 'token': this.getToken() } })
        //  Taro.request 请求
        console.log("before TaroRequest", opts)
        const res = await Taro.request(opts)

        if (res.statusCode === 401 || res.statusCode === 400 || res.statusCode === 403) {
            console.log(res)
            Tips.toast("出错，请联系管理员PP")
        }

        // 是否mock
        if (ISMOCK) { return res.data }

        // 登陆失效 
        if (res.data.code === 99999) { await this.login(); return this.request(opts) }

        // 请求成功
        // if (res.data && res.data.code === 0 || res.data.succ === 0) { return res.data }
        if (res.data) { return res.data }

        // 请求错误
        const d = { ...res.data, err: (res.data && res.data.msg) || `网络错误～` }
        await this.login()
        Tips.toast(d.err);
        Taro.redirectTo({url: "/pages/authorize/authorize"}).then(() => Tips.toast("鉴权失败，请尝试重新授权。如果依然失败，请联系管理员"))
        throw new Error(d.err)
    }

    /**
     * 
     * @static 登陆
     * @returns  promise 
     * @memberof Request
     */
    static login() {
        if (!this.isLogining) { this.loginReadyPromise = this.onLogining() }
        return this.loginReadyPromise
    }

    /**
     *
     * @static 登陆的具体方法
     * @returns
     * @memberof Request
     */
    static onLogining() {
        this.isLogining = true
        return new Promise(async (resolve, reject) => {
            // 获取code
            const { code } = await Taro.login()
            // 请求登录
            const { data } = await Taro.request({
                url: `${MAINHOST}${requestConfig.loginUrl}`,
                data: { js_code: code }
            })
            console.log("onLogining.data", data)
            if (data.unionid! === "") {
                Taro.navigateTo({url: "/pages/authorize/authorize"})
            }
            console.log("redirected to authorize", "unionid: ", data.unionid, "learnerFullName: ", data.learnerFullName)

            if (!data.token) {
                reject()
                return
            }

            await Taro.setStorageSync('token', data.token)
            await Taro.setStorageSync('learnerFullName', data.learnerFullName)
            await Taro.setStorageSync('unionid', data.unionid)
            await Taro.setStorageSync('isAdmin', data.isAdmin)
            this.isLogining = false
            resolve()
        })
    }

    /**
     *
     * @static  创建请求函数
     * @param {(Options | string)} opts
     * @returns
     * @memberof Request
     */
    static creatRequests(opts: Options | string): () => {} {
        return async (data = {}, method: Methods = "GET") => {
            const _opts = this.combineOptions(opts, data, method)
            const res = await this.request(_opts)
            // createLogger({ title: 'request', req: _opts, res: res })
            return res
        }
    }

    /**
     *
     * @static 抛出整个项目的api方法
     * @returns
     * @memberof Request
     */
    static getApiList(requestConfig) {
        if (!Object.keys(requestConfig).length) return {}

        Object.keys(requestConfig).forEach((key) => {
            this.apiLists[key] = this.creatRequests(requestConfig[key])
        })
        return this.apiLists
    }
}

// 导出
const Api = Request.getApiList(requestConfig)
Component.prototype.$api = Api
export default Api as any
