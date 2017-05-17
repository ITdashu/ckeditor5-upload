/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import { isImageType } from '../src/utils';

describe( 'utils', () => {
	describe( 'isImageType', () => {
		it( 'should return true for png mime type', () => {
			expect( isImageType( { type: 'image/png' } ) ).to.be.true;
		} );

		it( 'should return true for jpeg mime type', () => {
			expect( isImageType( { type: 'image/jpeg' } ) ).to.be.true;
		} );

		it( 'should return true for gif mime type', () => {
			expect( isImageType( { type: 'image/gif' } ) ).to.be.true;
		} );

		it( 'should return true for bmp mime type', () => {
			expect( isImageType( { type: 'image/bmp' } ) ).to.be.true;
		} );

		it( 'should return false for other mime types', () => {
			expect( isImageType( { type: 'audio/mp3' } ) ).to.be.false;
			expect( isImageType( { type: 'video/mpeg' } ) ).to.be.false;
		} );
	} );
} );
