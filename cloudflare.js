#!/usr/bin/env node

'use strict';

let fs = require('fs')
let axios = require('axios')
let jsdom = require('jsdom')

class CloudFlare {
	constructor(url) {
		this.url = url
		this.file = './headers.json'
		this.sleep = 3
		this.base = url.split('/')[0] + '//' + url.split('/')[2]
		this.config = { headers: { 'User-Agent': 'crystal/gems' }, params: {} }

		return new Promise((resolve, reject) => {
			this.resolve = resolve
			this.reject = reject

			fs.readFile(this.file, (err, data) => {
				if(!err) this.config.headers = JSON.parse(data)

				this.requestFile()
			})
		})
	}

	requestFile() {
		axios.get(this.url, this.config).then(this.resolve).catch((res) => {
			if(res.code == 'ENOTFOUND') this.reject(res.code)
			if(res.headers.server !== 'cloudflare-nginx') this.resolve(res)
			if(!res.headers['set-cookie']) this.reject('Got no new session cookie. Try deleting ' + file + '.')

			this.config.headers['Cookie'] = [res.headers['set-cookie'][0].split(';')[0]]

			jsdom.env(res.data, (err, window) => { this.parseDom(err, window) })
		})
	}

	parseDom(err, window) {
		let form = window.document.querySelector('#challenge-form')

		for(let input of form.querySelectorAll('input'))
			this.config.params[input.name] = input.value

		this.config.params['jschl_answer'] = this.solveJschlChallange(window.document.querySelector('script').innerHTML)

		setTimeout(() => { this.getClearance(this.base + form.action) }, this.sleep * 1000)
	}

	getClearance(url) {
		axios.get(url, this.config).catch((res) => {
			if(!res.headers['set-cookie']) this.reject('Got no auth cookie.')

			this.config.headers['Cookie'].push(res.headers['set-cookie'][0].split(';')[0])

			fs.writeFile(this.file, JSON.stringify(this.config.headers), (err) => {
				this.requestFile()
			})
		})
	}

	solveJschlChallange(script) {
		let match
		let jschl = /\:([\+\(\)\[\]!]+)/.exec(script)[1] // initial value
		let regex = /[a-z]+\.[a-z]+([\+\-\*\/])=([\+\(\)\[\]!]+);/gi // all the other lines

		// don't try this at home
		while(match = regex.exec(script))
			jschl = eval(`(${jschl}) ${match[1]} (${match[2]})`)

		jschl = + jschl + this.url.split('/')[2].length

		return jschl
	}
}

new CloudFlare(process.argv[2]).then((res) => {
	console.log(res.data)
}, (err) => {
	console.log(err)
})
