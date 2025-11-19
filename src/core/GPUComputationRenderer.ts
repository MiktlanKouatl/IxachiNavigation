/**
 * @author yomboprime https://github.com/yomboprime
 *
 * GPUComputationRenderer, based on SimulationRenderer by zz85
 *
 * The GPUComputationRenderer uses the GPU for specific parallel computation, also
 * known as GPGPU. The data is stored in textures.
 *
 * Read back the data to the CPU is possible, but it is slow.
 *
 * @param {number} sizeX Computation problem size is sizeX x sizeY elements.
 * @param {number} sizeY Computation problem size is sizeX x sizeY elements.
 * @param {WebGLRenderer} renderer The renderer
 */

import {
	Camera,
	ClampToEdgeWrapping,
	DataTexture,
	FloatType,
	HalfFloatType,
	Mesh,
	NearestFilter,
	PlaneGeometry,
	RGBAFormat,
	Scene,
	ShaderMaterial,
	WebGLRenderTarget
} from 'three';

export class GPUComputationRenderer {

	public variables: any[] = [];
	public currentTextureIndex: number = 0;
	private scene: Scene;
	private camera: Camera;
	private renderer: any;
	private passThruShader: ShaderMaterial;
	private passThruUniforms: { passThruTexture: { value: any; }; };
	private mesh: Mesh;
	private sizeX: number;
	private sizeY: number;

	constructor( sizeX: number, sizeY: number, renderer: any ) {

		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.renderer = renderer;

		this.scene = new Scene();
		this.camera = new Camera();
		this.camera.position.z = 1;

		this.passThruUniforms = {
			passThruTexture: { value: null }
		};

		this.passThruShader = this.createShaderMaterial( this.getPassThroughFragmentShader(), this.passThruUniforms );

		this.mesh = new Mesh( new PlaneGeometry( 2, 2 ), this.passThruShader );
		this.scene.add( this.mesh );

	}

	public createTexture(): DataTexture {

		const data = new Float32Array( this.sizeX * this.sizeY * 4 );
		const texture = new DataTexture( data, this.sizeX, this.sizeY, RGBAFormat, FloatType );
		texture.minFilter = NearestFilter;
		texture.magFilter = NearestFilter;
		return texture;

	}

	public createShaderMaterial( computeFragmentShader: string, uniforms: any = {} ): ShaderMaterial {

		const material = new ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: this.getPassThroughVertexShader(),
			fragmentShader: computeFragmentShader
		} );

		this.addResolutionDefine( material, 0, 0 ); // Will be set later

		return material;

	}

	public addVariable( variableName: string, computeFragmentShader: string, initialValueTexture: DataTexture ): any {

		const material = this.createShaderMaterial( computeFragmentShader );

		const variable = {
			name: variableName,
			initialValueTexture: initialValueTexture,
			material: material,
			dependencies: null,
			renderTargets: [] as WebGLRenderTarget[],
			wrapS: null,
			wrapT: null,
			minFilter: NearestFilter,
			magFilter: NearestFilter
		};

		this.variables.push( variable );

		return variable;

	}

	public setVariableDependencies( variable: any, dependencies: any[] ): void {

		variable.dependencies = dependencies;

	}

	public init(): string | null {

		this.addResolutionDefine( this.passThruShader, this.sizeX, this.sizeY );

		if ( ! this.renderer.capabilities.isWebGL2 && ! this.renderer.extensions.get( 'OES_texture_float' ) ) {

			return 'No OES_texture_float support for float textures.';

		}

		if ( this.renderer.capabilities.maxVertexTextures === 0 ) {

			return 'No support for vertex shader textures.';

		}

		for ( let i = 0; i < this.variables.length; i ++ ) {

			const variable = this.variables[ i ];

			// Creates rendertargets and initializes them with given texture
			variable.renderTargets[ 0 ] = this.createRenderTarget( variable.wrapS, variable.wrapT, variable.minFilter, variable.magFilter );
			variable.renderTargets[ 1 ] = this.createRenderTarget( variable.wrapS, variable.wrapT, variable.minFilter, variable.magFilter );
			this.renderTexture( variable.initialValueTexture, variable.renderTargets[ 0 ] );
			this.renderTexture( variable.initialValueTexture, variable.renderTargets[ 1 ] );

			// Adds dependencies uniforms to the ShaderMaterial
			const material = variable.material;
			const uniforms = material.uniforms;

			if ( variable.dependencies !== null ) {

				for ( let d = 0; d < variable.dependencies.length; d ++ ) {

					const depVar = variable.dependencies[ d ];

					uniforms[ depVar.name ] = { value: null };

					material.fragmentShader = '\nuniform sampler2D ' + depVar.name + ';\n' + material.fragmentShader;

				}

			}

		}

		this.setSize( this.sizeX, this.sizeY );
		this.currentTextureIndex = 0;

		return null;

	}

	public compute(): void {

		const currentTextureIndex = this.currentTextureIndex;
		const nextTextureIndex = this.currentTextureIndex === 0 ? 1 : 0;

		for ( let i = 0, il = this.variables.length; i < il; i ++ ) {

			const variable = this.variables[ i ];

			// Sets texture dependencies
			if ( variable.dependencies !== null ) {

				const uniforms = variable.material.uniforms;
				for ( let d = 0, dl = variable.dependencies.length; d < dl; d ++ ) {

					const depVar = variable.dependencies[ d ];

					uniforms[ depVar.name ].value = depVar.renderTargets[ currentTextureIndex ].texture;

				}

			}

			// Computes
			this.doRenderTarget( variable.material, variable.renderTargets[ nextTextureIndex ] );

		}

		this.currentTextureIndex = nextTextureIndex;

	}

	public getCurrentRenderTarget( variable: { name: string; } ): WebGLRenderTarget {

		return this.getRenderTarget( variable, this.currentTextureIndex );

	}

	public getAlternateRenderTarget( variable: { name: string; } ): WebGLRenderTarget {

		return this.getRenderTarget( variable, this.currentTextureIndex === 0 ? 1 : 0 );

	}

	private getRenderTarget( variable: { name: string; }, index: number ): WebGLRenderTarget {

		// Checks if variable exists
		let found = false;
		let i;
		for ( i = 0; i < this.variables.length; i ++ ) {

			if ( variable.name === this.variables[ i ].name ) {

				found = true;
				break;

			}

		}

		if ( ! found ) {

			throw new Error( 'Variable not found: ' + variable.name );

		}

		return this.variables[ i ].renderTargets[ index ];

	}

	private addResolutionDefine( material: ShaderMaterial, sizeX: number, sizeY: number ): void {

		material.defines.resolution = 'vec2( ' + sizeX.toFixed( 1 ) + ', ' + sizeY.toFixed( 1 ) + ' )';

	}

	public setSize( sizeX: number, sizeY: number ): void {

		this.addResolutionDefine( this.passThruShader, sizeX, sizeY );

		for ( let i = 0; i < this.variables.length; i ++ ) {

			const variable = this.variables[ i ];
			variable.renderTargets[ 0 ].setSize( sizeX, sizeY );
			variable.renderTargets[ 1 ].setSize( sizeX, sizeY );

			this.addResolutionDefine( variable.material, sizeX, sizeY );

		}

	}

	private createRenderTarget( wrapS: any, wrapT: any, minFilter: any, magFilter: any ): WebGLRenderTarget {

		const renderTarget = new WebGLRenderTarget( this.sizeX, this.sizeY, {
			wrapS: wrapS || ClampToEdgeWrapping,
			wrapT: wrapT || ClampToEdgeWrapping,
			minFilter: minFilter || NearestFilter,
			magFilter: magFilter || NearestFilter,
			format: RGBAFormat,
			type: ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent ) ) ? HalfFloatType : FloatType,
			stencilBuffer: false
		} );

		return renderTarget;

	}

	private doRenderTarget( material: ShaderMaterial, output: WebGLRenderTarget ): void {

		const currentRenderTarget = this.renderer.getRenderTarget();

		this.mesh.material = material;
		this.renderer.setRenderTarget( output );
		this.renderer.render( this.scene, this.camera );
		this.mesh.material = this.passThruShader;

		this.renderer.setRenderTarget( currentRenderTarget );

	}

	private renderTexture( input: DataTexture, output: WebGLRenderTarget ): void {

		this.passThruUniforms.passThruTexture.value = input;
		this.doRenderTarget( this.passThruShader, output );

	}

	private getPassThroughVertexShader(): string {

		return 'void main()\t{\n' +
		'\n' +
		'	gl_Position = vec4( position, 1.0 );\n' +
		'\n' +
		'}\n';

	}

		private getPassThroughFragmentShader(): string {

		return 'uniform sampler2D passThruTexture;\n' +
		'\n' +
		'void main() {\n' +
		'\n' +
		'	vec4 texelColor = texture2D( passThruTexture, gl_FragCoord.xy / resolution.xy );\n' +
		'\n' +
		'	gl_FragColor = texelColor;\n' +
		'\n' +
		'}\n';

	}

}
