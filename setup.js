#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🎉 Vigi Setup - Instalando dependencias...\n');

// Función para ejecutar npm install en un directorio
function npmInstall(directory, name) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Instalando dependencias de ${name}...`);
    
    const process = spawn('npm', ['install'], {
      cwd: path.join(__dirname, directory),
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${name} - Dependencias instaladas correctamente\n`);
        resolve();
      } else {
        console.log(`❌ ${name} - Error instalando dependencias (código: ${code})\n`);
        reject(new Error(`npm install failed in ${directory}`));
      }
    });

    process.on('error', (error) => {
      console.log(`❌ ${name} - Error: ${error.message}\n`);
      reject(error);
    });
  });
}

// Función para verificar si Node.js y npm están instalados
function checkPrerequisites() {
  return new Promise((resolve, reject) => {
    const nodeProcess = spawn('node', ['--version'], { shell: true });
    
    nodeProcess.on('close', (code) => {
      if (code === 0) {
        const npmProcess = spawn('npm', ['--version'], { shell: true });
        
        npmProcess.on('close', (npmCode) => {
          if (npmCode === 0) {
            console.log('✅ Node.js y npm están instalados\n');
            resolve();
          } else {
            reject(new Error('npm no está instalado'));
          }
        });
      } else {
        reject(new Error('Node.js no está instalado'));
      }
    });
  });
}

// Función para copiar archivo .env si no existe
function setupEnvironment() {
  const envPath = path.join(__dirname, 'backend', '.env');
  const envExamplePath = path.join(__dirname, 'backend', '.env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('📄 Copiando archivo de configuración .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Archivo .env creado desde .env.example\n');
  }
}

async function setup() {
  try {
    console.log('🔍 Verificando prerequisitos...');
    await checkPrerequisites();
    
    console.log('⚙️ Configurando entorno...');
    setupEnvironment();
    
    console.log('📦 Iniciando instalación de dependencias...\n');
    
    // Instalar dependencias en orden
    await npmInstall('.', 'Proyecto Principal');
    await npmInstall('backend', 'Backend');
    await npmInstall('frontend', 'Frontend');
    
    console.log('🎉 ¡Instalación completada exitosamente!\n');
    
    console.log('🚀 Comandos disponibles:');
    console.log('   npm run dev          - Arrancar todo en puerto 3000');
    console.log('   npm run dev:simple   - Arrancar sin proxy');
    console.log('   npm run seed         - Poblar base de datos');
    console.log('   npm run docker:up    - Usar Docker\n');
    
    console.log('✨ Para comenzar ejecuta: npm run dev');
    
  } catch (error) {
    console.error('❌ Error durante la instalación:', error.message);
    console.log('\n🛠️ Soluciones posibles:');
    console.log('1. Verificar que Node.js y npm estén instalados');
    console.log('2. Ejecutar como administrador');
    console.log('3. Limpiar cache: npm cache clean --force');
    console.log('4. Instalar manualmente: cd backend && npm install');
    process.exit(1);
  }
}

setup();