/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document, Event */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Image from '@ckeditor/ckeditor5-image/src/image';
import FileDialogButtonView from '../src/ui/filedialogbuttonview';
import FileRepository from '../src/filerepository';
import ImageUploadUI from '../src/imageuploadui';
import ImageUploadEditing from '../src/imageuploadediting';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Notification from '@ckeditor/ckeditor5-ui/src/notification/notification';

import { createNativeFileMock, AdapterMock } from './_utils/mocks';
import { setData as setModelData, getData as getModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

describe( 'ImageUploadUI', () => {
	let editor, model, editorElement, fileRepository;

	class UploadAdapterPluginMock extends Plugin {
		init() {
			fileRepository = this.editor.plugins.get( FileRepository );
			fileRepository.createAdapter = loader => {
				return new AdapterMock( loader );
			};
		}
	}

	beforeEach( () => {
		editorElement = document.createElement( 'div' );
		document.body.appendChild( editorElement );

		return ClassicEditor
			.create( editorElement, {
				plugins: [ Paragraph, Image, ImageUploadEditing, ImageUploadUI, FileRepository, UploadAdapterPluginMock ]
			} )
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;

				// Hide all notifications (prevent alert() calls).
				const notification = editor.plugins.get( Notification );
				notification.on( 'show', evt => evt.stop() );
			} );
	} );

	afterEach( () => {
		editorElement.remove();

		return editor.destroy();
	} );

	it( 'should register uploadImage button', () => {
		const button = editor.ui.componentFactory.create( 'uploadImage' );

		expect( button ).to.be.instanceOf( FileDialogButtonView );
	} );

	it( 'should be disabled while ImageUploadCommand is disabled', () => {
		const button = editor.ui.componentFactory.create( 'uploadImage' );
		const command = editor.commands.get( 'imageUpload' );

		command.isEnabled = true;

		expect( button.buttonView.isEnabled ).to.true;

		command.isEnabled = false;

		expect( button.buttonView.isEnabled ).to.false;
	} );

	// ckeditor5-upload/#77
	it( 'should be properly bound with ImageUploadCommand', () => {
		const button = editor.ui.componentFactory.create( 'uploadImage' );
		const command = editor.commands.get( 'imageUpload' );
		const spy = sinon.spy();

		button.render();

		button.buttonView.on( 'execute', spy );

		command.isEnabled = false;

		button.buttonView.element.dispatchEvent( new Event( 'click' ) );

		sinon.assert.notCalled( spy );
	} );

	it( 'should execute imageUpload command', () => {
		const executeStub = sinon.stub( editor, 'execute' );
		const button = editor.ui.componentFactory.create( 'uploadImage' );
		const files = [ createNativeFileMock() ];

		button.fire( 'done', files );
		sinon.assert.calledOnce( executeStub );
		expect( executeStub.firstCall.args[ 0 ] ).to.equal( 'imageUpload' );
		expect( executeStub.firstCall.args[ 1 ].file ).to.equal( files[ 0 ] );
	} );

	it( 'should optimize the insertion position', () => {
		const button = editor.ui.componentFactory.create( 'uploadImage' );
		const files = [ createNativeFileMock() ];

		setModelData( model, '<paragraph>f[]oo</paragraph>' );

		button.fire( 'done', files );

		const id = fileRepository.getLoader( files[ 0 ] ).id;

		expect( getModelData( model ) ).to.equal(
			`[<image uploadId="${ id }" uploadStatus="reading"></image>]` +
			'<paragraph>foo</paragraph>'
		);
	} );

	it( 'should correctly insert multiple files', () => {
		const button = editor.ui.componentFactory.create( 'uploadImage' );
		const files = [ createNativeFileMock(), createNativeFileMock() ];

		setModelData( model, '<paragraph>foo[]</paragraph><paragraph>bar</paragraph>' );

		button.fire( 'done', files );

		const id1 = fileRepository.getLoader( files[ 0 ] ).id;
		const id2 = fileRepository.getLoader( files[ 1 ] ).id;

		expect( getModelData( model ) ).to.equal(
			'<paragraph>foo</paragraph>' +
			`<image uploadId="${ id1 }" uploadStatus="reading"></image>` +
			`[<image uploadId="${ id2 }" uploadStatus="reading"></image>]` +
			'<paragraph>bar</paragraph>'
		);
	} );

	it( 'should not execute imageUpload if the file is not an image', () => {
		const executeStub = sinon.stub( editor, 'execute' );
		const button = editor.ui.componentFactory.create( 'uploadImage' );
		const file = {
			type: 'media/mp3',
			size: 1024
		};

		button.fire( 'done', [ file ] );
		sinon.assert.notCalled( executeStub );
	} );

	it( 'should work even if the FileList does not support iterators', () => {
		const executeStub = sinon.stub( editor, 'execute' );
		const button = editor.ui.componentFactory.create( 'uploadImage' );
		const files = {
			0: createNativeFileMock(),
			length: 1
		};

		button.fire( 'done', files );
		sinon.assert.calledOnce( executeStub );
		expect( executeStub.firstCall.args[ 0 ] ).to.equal( 'imageUpload' );
		expect( executeStub.firstCall.args[ 1 ].file ).to.equal( files[ 0 ] );
	} );
} );

