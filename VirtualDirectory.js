
/*
 *  VirtualDirectory.js
 *  Version 1.0.1
 *
 *  Copyright (c) izure.org 2017. All rights reserved.
 *  MIT license -> https://izure.org
 *
 */

'use strict';

class VirtualDirectory {

	constructor() {
		this.files = new Map();
		this.directorys = new Map();
		this.element = null;
		this.currentPath = '/';
	}

	static createUUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	static adaptPath(path) {
		const offsets = path.split('/');
		const len = offsets.length;
		if (offsets[len - 1] === '') {
			offsets.pop();
		}
		if (offsets[0] === '') {
			offsets.shift();
		}
		return `/${offsets.join('/')}`.replace(/\/{2,}/gmi, '/');
	}

	static getElements() {
		const dirs = Array.from(this.directorys.keys());
		const files = Array.from(this.files.keys());
		return [...dirs, ...files];
	}

	static throw(type, argument) {
		switch (type) {
			case 'ENOENT':
				throw new Error(`'${argument.path}' path is not exist.`);
				break;
			case 'ENOTDIR':
				throw new Error(`The '${argument.path}' path is must be type of directory.`);
				break;
			case 'ENOTFILE':
				throw new Error(`The '${argument.path}' path is must be type of file.`);
				break;
			case 'EEXIST':
				throw new Error(`'${argument.path}' path is already exist.`);
				break;
			case 'ENOTEMPTY':
				throw new Error(`'${argument.path}' directory not empty.`);
				break;
			default:
				throw new Error('Unknown Error.');
				break;
		}
	}

	static stat(offset) {
		let iteminfo = null;
		for (const directory of this.directorys.values()) {
			if (directory.id === offset) {
				iteminfo = directory;
				break;
			}
		}
		return iteminfo;
	}

	static getDirectoryPath(offset, array = []) {
		const iteminfo = VirtualDirectory.stat.call(this, offset);
		if (iteminfo) {
			array.unshift(iteminfo.id);
			array = VirtualDirectory.getDirectoryPath.call(this, iteminfo.offset, array);
			return array;
		}
		else {
			let path = '';
			for (const offset of array) {
				path = VirtualDirectory.adaptPath(`${path}/${VirtualDirectory.stat.call(this, offset).name}`);
			}
			return path;
		}
	}

	init(element) {
		this.files.clear();
		this.directorys.clear();
		this.element = element;
		this.currentPath = '/';
		this.toDirectory(element, '/');
		return this;
	}

	stat(path) {
		// check Directory
		let stat = {
			isDirectory: function () {
				if (this.type === 'directory') return true;
				else return false;
			},
			isFile: function () {
				if (this.type === 'file') return true;
				else return false;
			}
		};
		path = VirtualDirectory.adaptPath(path);
		for (const directory of this.directorys.values()) {
			const fullpath = `${directory.path}/${directory.name}`;
			if (path === VirtualDirectory.adaptPath(fullpath)) {
				stat = Object.assign({}, { type: 'directory', path: path}, stat, directory);
			}
		}
		for (const file of this.files.values()) {
			const fullpath = `${file.path}/${file.name}`;
			if (path === VirtualDirectory.adaptPath(fullpath)) {
				stat = Object.assign({}, { type: 'file', path: path }, stat, file);
			}
		}
		if (!stat.type) {
			VirtualDirectory.throw('ENOENT', { path: path });
			return;
		}
		return stat;
	}

	toFile(element, path) {
		if (element instanceof HTMLElement === false) {
			throw new Error('The first arguments must be instanced object of HTMLElement.');
		}
		const self = this;
		const offsets = path.split('/');
		const filename = offsets.pop();
		const directory = offsets.join('/');
		const uuid = VirtualDirectory.createUUID();
		let isExist;
		try {
			isExist = this.stat(path);
		}
		catch (e) {
			let iteminfo;
			try {
				iteminfo = this.stat(directory);
				if (iteminfo.isDirectory() === false) {
					VirtualDirectory.throw('ENOTDIR', { path: directory });
					return;
				}
			}
			catch (e) {
				throw e;
			};
			// insert data
			element.setAttribute('data-vd-file', true);
			this.files.set(element, {
				id: uuid,
				name: filename,
				offset: iteminfo.id,
				get path() {
					return VirtualDirectory.getDirectoryPath.call(self, this.offset);
				}
			});
			this.refresh();
		}
		finally {
			if (isExist) {
				VirtualDirectory.throw('EEXIST', { path: path });
				return;
			}
		}
	}

	toDirectory(element, path) {
		if (element instanceof HTMLElement === false) {
			throw new Error('The first arguments must be instanced object of HTMLElement.');
		}
		const self = this;
		const offsets = path.split('/');
		const directoryname = offsets.pop();
		const directory = offsets.join('/');
		const uuid = VirtualDirectory.createUUID();
		let isExist;
		// check root directory
		const setDirectory = () => {
			let dirinfo = { id: null };
			try {
				dirinfo = this.stat(directory);
			}
			catch (e) { };
			// insert data
			element.setAttribute('data-vd-directory', true);
			this.directorys.set(element, {
				id: uuid,
				name: directoryname,
				offset: dirinfo.id,
				get path() {
					return VirtualDirectory.getDirectoryPath.call(self, this.offset);
				}
			});
			this.refresh();
		};
		try {
			isExist = this.stat(path);
		}
		catch (e) {
			if (directory.length === 0) {
				setDirectory();
				return;
			}
			let iteminfo;
			try {
				iteminfo = this.stat(directory);
				if (iteminfo.isDirectory() === false) {
					VirtualDirectory.throw('ENOTDIR', { path: directory });
					return;
				}
			}
			catch (e) {
				throw e;
			}
			setDirectory();
		}
		finally {
			if (isExist) {
				VirtualDirectory.throw('EEXIST', { path: path });
				return;
			}
		}
	}

	rmdir(path) {
		path = VirtualDirectory.adaptPath(path);
		let iteminfo;
		try {
			iteminfo = this.stat(path);
		}
		catch (e) {
			VirtualDirectory.throw('ENOENT', { path: path });
			return;
		}
		if (iteminfo.isDirectory() === false) {
			VirtualDirectory.throw('ENOTDIR', { path: path });
			return;
		}
		let isNotEmpty = false;
		for (const directory of this.directorys.values()) {
			if (directory.offset === iteminfo.id) isNotEmpty = true;
		}
		for (const file of this.files.values()) {
			if (file.offset === iteminfo.id) isNotEmpty = true;
		}
		if (isNotEmpty) {
			VirtualDirectory.throw('ENOTEMPTY', { path: path });
			return;
		}
		for (const data of this.directorys.entries()) {
			const element = data[0];
			const directory = data[1];
			if (directory.id === iteminfo.id) {
				// remove directory data and element
				element.parentNode.removeChild(element);
				this.directorys.delete(element);
				this.refresh();
			}
		}
	}

	unlink(path) {
		path = VirtualDirectory.adaptPath(path);
		let iteminfo;
		try {
			iteminfo = this.stat(path);
		}
		catch (e) {
			VirtualDirectory.throw('ENOENT', { path: path });
			return;
		}
		if (iteminfo.isFile() === false) {
			VirtualDirectory.throw('ENOTFILE', { path: path });
			return;
		}
		for (const data of this.files.entries()) {
			const element = data[0];
			const file = data[1];
			if (file.id === iteminfo.id) {
				// remove file data and element
				element.parentNode.removeChild(element);
				this.files.delete(element);
				this.refresh();
			}
		}
	}

	refresh() {
		const items = this.element.querySelectorAll('*');
		for (const item of items) {
			item.style.display = 'none';
			if (this.directorys.has(item)) {
				const iteminfo = this.directorys.get(item);
				if (iteminfo.path === this.currentPath) {
					item.style.display = 'block';
				}
			}
			if (this.files.has(item)) {
				const iteminfo = this.files.get(item);
				if (iteminfo.path === this.currentPath) {
					item.style.display = 'block';
				}
			}
		}
	}

	rename(rawbefore, rawafter) {
		const before = VirtualDirectory.adaptPath(rawbefore);
		const after = VirtualDirectory.adaptPath(rawafter);
		// except lower directory
		if (
			after.indexOf(before) === 0
			&& before.split('/').length < after.split('/').length
		) {
			throw new Error('You can not move the source directory to a lower directory.');
		}
		let iteminfo;
		try {
			iteminfo = this.stat(before);
		}
		catch (e) {
			throw e;
		};
		// if not root directory
		if (!iteminfo.offset) {
			throw new Error(`The First argument must not root directory.`);
		}
		let afterinfo;
		try {
			afterinfo = this.stat(after);
		}
		catch (e) {
			const offsets = after.split('/');
			const basename = offsets.pop();
			const dirname = VirtualDirectory.adaptPath(offsets.join('/'));
			let dirinfo;
			try {
				dirinfo = this.stat(dirname);
				for (const directory of this.directorys.values()) {
					if (directory.id !== iteminfo.id) continue;
					directory.name = basename;
					directory.offset = dirinfo.id;
				}
				for (const file of this.files.values()) {
					if (file.id !== iteminfo.id) continue;
					file.name = basename;
					file.offset = dirinfo.id;
				}
				this.refresh();
			}
			catch (e) {
				throw e;
			}
		}
		finally {
			if (afterinfo) {
				VirtualDirectory.throw('EEXIST', { path: after });
				return;
			}
		}
	}

	ls(path) {
		path = VirtualDirectory.adaptPath(path);
		const dirs = [];
		const files = [];
		for (const directory of this.directorys.values()) {
			const dirpath = VirtualDirectory.adaptPath(directory.path);
			if (dirpath === path) {
				// except root directory
				if (directory.name.length === 0) continue;
				dirs.push(directory.name);
			}
		}
		for (const file of this.files.values()) {
			const filepath = VirtualDirectory.adaptPath(file.path);
			if (filepath === path) {
				files.push(file.name);
			}
		}
		return [...dirs, ...files];
	}

	cd(path) {
		path = VirtualDirectory.adaptPath(path);
		let iteminfo;
		try {
			iteminfo = this.stat(path);
		}
		catch (e) {
			VirtualDirectory.throw('ENOENT', { path: path });
			return;
		}
		if (iteminfo.isDirectory() === false) {
			VirtualDirectory.throw('ENOTDIR', { path: path });
			return;
		}
		this.currentPath = path;
		this.refresh();
	}

	get(path) {
		path = VirtualDirectory.adaptPath(path);
		let iteminfo;
		try {
			iteminfo = this.stat(path);
		}
		catch (e) {
			throw e;
		}
		const target = iteminfo.isDirectory() ? this.directorys : this.files;
		let element = null;
		for (const data of target.entries()) {
			const tarelem = data[0];
			const item = data[1];
			if (iteminfo.id === item.id) {
				element = tarelem;
				break;
			}
		}
		return element;
	}

};
