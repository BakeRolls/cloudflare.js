#!/usr/bin/node

'use strict';

let fs = require('fs')
let axios = require('axios')
let jsdom = require('jsdom')

let url = process.argv[2]
let file =  process.argv[3] || './headers.json'
let sleep = 3
let base = url.split('/')[0] + '//' + url.split('/')[2]
let config = { headers: {}, params: {} }

fs.readFile(file, (err, data) => {
	if(!err) config.headers = JSON.parse(data)

	requestFile()
})

let requestFile = () => {
	axios.get(url, config).catch((res) => {
		if(res.status != 503) return false

		config.headers['Cookie'] = [res.headers['set-cookie'][0].split(';')[0]]

		jsdom.env(res.data, parseDom)
	}).then((res) => {
		console.log(res.data)
	})
}

let parseDom = (err, window) => {
	let form = window.document.querySelector('#challenge-form')

	for(let input of form.querySelectorAll('input'))
		config.params[input.name] = input.value

	config.params['jschl_answer'] = solveJschlChallange(window.document)

	setTimeout(() => { getClearance(base + form.action) }, sleep * 1000)
}

let getClearance = (action) => {
	axios.get(action, config).catch((res) => {
		if(!res.headers['set-cookie'])
			return false

		config.headers['Cookie'].push(res.headers['set-cookie'][0].split(';')[0])

		fs.writeFile(file, JSON.stringify(config.headers))

		/*
		console.log('curl "' + url + '" \\')

		for(let key in config.headers) {
			data = config.headers[key]

			if(key == 'Cookie') data.join('; ')

			else console.log('-H "' + key + ': ' + data + '" \\')
		}

		console.log('--compressed')
		*/

		requestFile()
	})
}

let solveJschlChallange = (document) => {
	let match
	let script = document.querySelector('script').innerHTML
	let jschl = /\:([\+\(\)\[\]!]+)/i.exec(script)[1]
	let regex = /[a-z]+\.[a-z]+([\+\-\*\/])=([\+\(\)\[\]!]+);/gi

	// don't try this at home
	while(match = regex.exec(script))
		jschl = eval('(' + jschl + ')' + match[1] + '(' + match[2] + ')')

	jschl = parseInt(jschl, 10) + url.split('/')[2].length + ''

	return jschl
}
