#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const prompts = require('prompts');
const validateName = require('validate-npm-package-name');

const { name, version } = require(path.join(__dirname, './package.json'));

const appDir = path.join(__dirname, `./package/stable`);
const appPackage = require(path.join(appDir, 'package.json'));

const getApplicationId = (token) => {
	try {
		/** @type {string} */
		const response = execSync(
			`curl -s -X GET -H "Authorization: Bot ${token}" "https://discord.com/api/oauth2/applications/@me"`
		).toString();
		const parsedResponse = JSON.parse(response);

		return parsedResponse.id || null;
	} catch {
		return null;
	}
};

prompts([
	{
		type: 'select',
		name: 'lang',
		message: 'Please select a language. 사용하실 언어를 선택해주세요.',
		choices: [
			{ title: 'Korean', description: '한국어를 선택하실려면 여기를 선택해주세요.', value: 'ko', },
			{ title: 'English', description: 'Select here to select English', value: 'en', },
		],
		initial: 1,
	},
])

	.then(async (/** @type {{ lang: string }} */ { lang }) => {
		if (lang == 'ko') {
			console.log(`이 시스템은 Create-Discord-bots CLI 로 제작중입니다..`);
			console.log(`ENTER 누를 시 기본설정으로 척용됩니다.`);
			console.log(`응답이 없을시 ^C를 눌러주세요`);
			console.log(`버전 : V${version}`);
			prompts([
				{
					type: 'text',
					name: 'name',
					initial: appPackage.name,
					validate: (/** @type {string} */ name) => {
						const { validForNewPackages, errors, warnings } = validateName(name);
						return validForNewPackages || `Error: ${(errors || warnings).join(', ')}.`;
					},
					message: '패키지 이름을 알려주세요(소문자, 영어 만 가능 띄어쓰기 특수문자 금지)',
				},
			]).then(async (/** @type {{ name: string }} */ { name }) => {
				prompts([
					{
						type: 'select',
						name: 'type',
						choices: [
							{
								title: '기본',
								description:
									'입문자분들이 정말로 잘 쓰는 기본 패키지',
								value: 'stable',
							},
							{
								title: '개발중',
								description: "I don't think there's any other type.",
								value: '?',
								disabled: true,
							},
						],
						initial: 1,
						message: '사용할 패키지를 선택해주세요.',
					},
				])
					.then(async (/** @type {{ type: string }} */ { type }) => {
						const dir = path.resolve(name);
						const isUpdate = fs.existsSync(dir);
						/** @type {Step[]} */
						let steps;

						if (isUpdate) {
							/** @type {{ update: boolean }}  */
							const { update } = await prompts([
								{
									type: 'confirm',
									name: 'update',
									message: `해당 '${dir}' 파일이 이미 존재합니다. 덮어씌울까요?`,
								},
							]);

							if (!update) {
								console.log();
								throw '취소됨. 시스템 종료중';
								process.exit(403)
							}

							steps = [
								{
									message: `'${name}' 풀더에 데이터 수정중...`,
									action: () => {
										fs.copySync(`${appDir}/`, `${dir}`);
									},
									ignoreDry: false,
								},
							];
						} else {
							/** @type {{ token: string }} */
							const { token } = await prompts([
								{
									type: 'password',
									name: 'token',
									initial: '봇_토큰을_입력하지_않았습니다',
									message: '디스코드 봇 토큰을 알려주세요?(절대 봇 토큰을 부정행위로 사용하지 않습니다.)',
								},
							]);

							steps = [
								{
									message: `'${name}'풀더를 만드는중...`,
									action: () => fs.mkdirSync(dir),
									ignoreDry: false,
								},
								{
									message: '깃허브 업로드시 필요없는 데이터들이 업로드 되지 않게 설정하는중...',
									action: () => {
										fs.copySync(appDir, dir);
										fs.writeFileSync(
											path.join(dir, '.gitignore'),
											'node_modules/\n.env\n'
										);
									},
									ignoreDry: false,
								},
								{
									message: 'package.json 업데이트 중...',
									action: () => {
										const description = `Generated by ${name}.`;
										const newPackage = { ...appPackage, name, description };
										fs.writeFileSync(
											path.join(dir, 'package.json'),
											`${JSON.stringify(newPackage, null, 2)}\n`
										);
									},
									ignoreDry: false,
								},
								{
									message: '.env 파일 수정중...',
									action: () =>
										fs.writeFileSync(path.join(dir, '.env'), `TOKEN=${token}`),
									ignoreDry: false,
								},
								{
									message: '모듈 다운로드중...(시간이 걸릴수 있습니다.)',
									action: () => {
										process.chdir(dir);
										execSync('npm i --s');
									},
									ignoreDry: false,
								},
								{
									message: '\n봇 토큰을 이용해 봇 초대링크 만드는중...',
									ignoreDry: true,
									action: () => {
										const applicationId = getApplicationId(token);
										console.log(
											applicationId
												? `자신의 봇 초대하기: https://discord.com/oauth2/authorize?scope=bot&client_id=${applicationId}`
												: '지정된 봇 토큰이 잘못되었기 때문에 초대 링크가 생성되지 않았습니다.'
										);
									},
								},
							];
						}

						const [, , ...args] = process.argv;
						const isDryRun = args[0] === '--dry-run';

						console.log();
						steps.forEach(({ message, ignoreDry, action }) => {
							console.log(message);
							if (ignoreDry || !isDryRun) {
								action();
							}
						});

						console.log();
						console.log(`완료되었습니다!\n\n이제 봇을 정상적으로 가동이 가능합니다.\n아래 명령어를 입력해 봇을 가동해보세요!\n\t$ cd ${name}/\n\t$ npm start`);
						process.exit(200)
					})
					.catch(console.error);
			});
		} else if (lang == 'en') {
			console.log(
				`This utility will walk you through creating a Create Discord Bots application.`
			);
			console.log(`Press ENTER to use the default.`);
			console.log(`Press ^C at any time to quit.`);
			console.log(`Version : V${version}`);
			prompts([
				{
					type: 'text',
					name: 'name',
					initial: appPackage.name,
					validate: (/** @type {string} */ name) => {
						const { validForNewPackages, errors, warnings } = validateName(name);
						return validForNewPackages || `Error: ${(errors || warnings).join(', ')}.`;
					},
					message: 'Application name?',
				},
			]).then(async (/** @type {{ name: string }} */ { name }) => {
				prompts([
					{
						type: 'select',
						name: 'type',
						choices: [
							{
								title: 'Stable',
								description:
									'Its the type thats used really well for first-time users.',
								value: 'stable',
							},
							{
								title: 'Coming soon...',
								description: "I don't think there's any other type.",
								value: '?',
								disabled: true,
							},
						],
						initial: 1,
						message: 'Please select a type.',
					},
				])
					.then(async (/** @type {{ type: string }} */ { type }) => {
						const dir = path.resolve(name);
						const isUpdate = fs.existsSync(dir);
						/** @type {Step[]} */
						let steps;

						if (isUpdate) {
							/** @type {{ update: boolean }}  */
							const { update } = await prompts([
								{
									type: 'confirm',
									name: 'update',
									message: `Directory '${dir}' already exists. Do you want to update it?`,
								},
							]);

							if (!update) {
								console.log();
								throw 'Quitting...'
								process.exit(403);
							}

							steps = [
								{
									message: `Updating core files in '${name}'...`,
									action: () => {
										fs.copySync(`${appDir}/${type}`, `${dir}`);
									},
									ignoreDry: false,
								},
							];
						} else {
							/** @type {{ token: string }} */
							const { token } = await prompts([
								{
									type: 'password',
									name: 'token',
									initial: 'BOT_TOKEN_HERE',
									message: 'Discord bot token?',
								},
							]);

							steps = [
								{
									message: `Creating directory '${name}'...`,
									action: () => fs.mkdirSync(dir),
									ignoreDry: false,
								},
								{
									message: 'Creating boilerplate...',
									action: () => {
										fs.copySync(appDir, dir);
										fs.writeFileSync(
											path.join(dir, '.gitignore'),
											'node_modules/\n.env\n'
										);
									},
									ignoreDry: false,
								},
								{
									message: 'Updating package.json...',
									action: () => {
										const description = `Generated by ${name}.`;
										const newPackage = { ...appPackage, name, description };
										fs.writeFileSync(
											path.join(dir, 'package.json'),
											`${JSON.stringify(newPackage, null, 2)}\n`
										);
									},
									ignoreDry: false,
								},
								{
									message: 'Writing .env...',
									action: () =>
										fs.writeFileSync(path.join(dir, '.env'), `TOKEN=${token}`),
									ignoreDry: false,
								},
								{
									message: 'Installing modules...',
									action: () => {
										process.chdir(dir);
										execSync('npm i --s');
									},
									ignoreDry: false,
								},
								{
									message: '\nGenerating bot invite link...',
									ignoreDry: true,
									action: () => {
										const applicationId = getApplicationId(token);
										console.log(
											applicationId
												? `Invite your bot: https://discord.com/oauth2/authorize?scope=bot&client_id=${applicationId}`
												: 'The given bot token was invalid so no invite link was generated.'
										);
									},
								},
							];
						}

						const [, , ...args] = process.argv;
						const isDryRun = args[0] === '--dry-run';

						console.log();
						steps.forEach(({ message, ignoreDry, action }) => {
							console.log(message);
							if (ignoreDry || !isDryRun) {
								action();
							}
						});

						console.log();
						console.log(`Done!\n\nStart by running:\n\t$ cd ${name}/\n\t$ npm start`);
						process.exit(200)
					})
					.catch(console.error);
			});
		}
	});