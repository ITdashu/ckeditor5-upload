/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals window */

import ClassicTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ImageEngine from '@ckeditor/ckeditor5-image/src/image/imageengine';
import ImageUploadEngine from '../src/imageuploadengine';
import ImageUploadProgress from '../src/imageuploadprogress';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import FileRepository from '../src/filerepository';

import { AdapterMock, createNativeFileMock, NativeFileReaderMock } from './_utils/mocks';
import { setData as setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { getData as getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view';
import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import svgPlaceholder from '../theme/icons/image_placeholder.svg';

describe( 'ImageUploadProgress', () => {
	const imagePlaceholder = encodeURIComponent( svgPlaceholder );

	// eslint-disable-next-line max-len
	const base64Sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
	let editor, model, document, fileRepository, viewDocument, nativeReaderMock, loader, adapterMock;

	class UploadAdapterPluginMock extends Plugin {
		init() {
			fileRepository = this.editor.plugins.get( FileRepository );
			fileRepository.createAdapter = newLoader => {
				loader = newLoader;
				adapterMock = new AdapterMock( loader );

				return adapterMock;
			};
		}
	}

	testUtils.createSinonSandbox();

	beforeEach( () => {
		testUtils.sinon.stub( window, 'FileReader' ).callsFake( () => {
			nativeReaderMock = new NativeFileReaderMock();

			return nativeReaderMock;
		} );

		return ClassicTestEditor
			.create( {
				plugins: [ ImageEngine, Paragraph, ImageUploadProgress, UploadAdapterPluginMock ]
			} )
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				document = model.document;
				viewDocument = editor.editing.view;

				fileRepository = editor.plugins.get( FileRepository );
				fileRepository.createAdapter = newLoader => {
					loader = newLoader;
					adapterMock = new AdapterMock( loader );

					return adapterMock;
				};
			} );
	} );

	it( 'should include ImageUploadEngine', () => {
		expect( editor.plugins.get( ImageUploadEngine ) ).to.be.instanceOf( ImageUploadEngine );
	} );

	it( 'should convert image\'s "reading" uploadStatus attribute', () => {
		setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'imageUpload', { file: createNativeFileMock() } );

		expect( getViewData( viewDocument ) ).to.equal(
			'[<figure class="ck-appear ck-image-upload-placeholder ck-infinite-progress ck-widget image" contenteditable="false">' +
				`<img src="data:image/svg+xml;utf8,${ imagePlaceholder }"></img>` +
			'</figure>]<p>foo</p>'
		);
	} );

	it( 'should convert image\'s "uploading" uploadStatus attribute', done => {
		setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'imageUpload', { file: createNativeFileMock() } );

		model.document.once( 'change', () => {
			expect( getViewData( viewDocument ) ).to.equal(
				'[<figure class="ck-appear ck-widget image" contenteditable="false">' +
					`<img src="${ base64Sample }"></img>` +
					'<div class="ck-progress-bar"></div>' +
				'</figure>]<p>foo</p>'
			);

			done();
		}, { priority: 'lowest' } );

		nativeReaderMock.mockSuccess( base64Sample );
	} );

	it( 'should update progressbar width on progress', done => {
		setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'imageUpload', { file: createNativeFileMock() } );

		model.document.once( 'change', () => {
			adapterMock.mockProgress( 40, 100 );

			expect( getViewData( viewDocument ) ).to.equal(
				'[<figure class="ck-appear ck-widget image" contenteditable="false">' +
				`<img src="${ base64Sample }"></img>` +
				'<div class="ck-progress-bar" style="width:40%"></div>' +
				'</figure>]<p>foo</p>'
			);

			done();
		}, { priority: 'lowest' } );

		nativeReaderMock.mockSuccess( base64Sample );
	} );

	it( 'should convert image\'s "complete" uploadStatus attribute', done => {
		setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'imageUpload', { file: createNativeFileMock() } );

		model.document.once( 'change', () => {
			model.document.once( 'change', () => {
				expect( getViewData( viewDocument ) ).to.equal(
					'[<figure class="ck-widget image" contenteditable="false">' +
						'<img src="image.png"></img>' +
					'</figure>]<p>foo</p>'
				);

				done();
			}, { priority: 'lowest' } );

			adapterMock.mockSuccess( { default: 'image.png' } );
		} );

		nativeReaderMock.mockSuccess( base64Sample );
	} );

	it( 'should allow to customize placeholder image', () => {
		const uploadProgress = editor.plugins.get( ImageUploadProgress );
		uploadProgress.placeholder = base64Sample;

		setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'imageUpload', { file: createNativeFileMock() } );

		expect( getViewData( viewDocument ) ).to.equal(
			'[<figure class="ck-appear ck-image-upload-placeholder ck-infinite-progress ck-widget image" contenteditable="false">' +
				`<img src="${ base64Sample }"></img>` +
			'</figure>]<p>foo</p>'
		);
	} );

	it( 'should not process attribute change if it is already consumed', () => {
		editor.editing.modelToView.on( 'attribute:uploadStatus:image', ( evt, data, consumable ) => {
			consumable.consume( data.item, evt.name );
		}, { priority: 'highest' } );

		setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'imageUpload', { file: createNativeFileMock() } );

		expect( getViewData( viewDocument ) ).to.equal(
			'[<figure class="ck-widget image" contenteditable="false"><img></img></figure>]<p>foo</p>'
		);
	} );

	it( 'should not show progress bar if there is no loader with given uploadId', () => {
		setModelData( model, '<image uploadId="123" uploadStatus="reading"></image>' );

		const image = document.getRoot().getChild( 0 );

		model.change( writer => {
			writer.setAttribute( 'uploadStatus', 'uploading', image );
		} );

		expect( getViewData( viewDocument ) ).to.equal(
			'[<figure class="ck-appear ck-image-upload-placeholder ck-infinite-progress ck-widget image" contenteditable="false">' +
				`<img src="data:image/svg+xml;utf8,${ imagePlaceholder }"></img>` +
			'</figure>]'
		);

		model.change( writer => {
			writer.setAttribute( 'uploadStatus', 'complete', image );
		} );

		expect( getViewData( viewDocument ) ).to.equal(
			'[<figure class="ck-widget image" contenteditable="false">' +
				`<img src="data:image/svg+xml;utf8,${ imagePlaceholder }"></img>` +
			'</figure>]'
		);
	} );
} );
