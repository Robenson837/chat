#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Iniciando Vigi en puerto 3000...\n');

// Función para ejecutar comandos
function runCommand(command, args, cwd, color = '\x1b[0m') {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd: path.join(__dirname, cwd),
      stdio: 'pipe',
      shell: true
    });

    const prefix = `${color}[${cwd.toUpperCase()}]\x1b[0m`;

    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`${prefix} ${line}`);
      });
    });

    process.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`${prefix} \x1b[31m${line}\x1b[0m`);
      });
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cwd} process exited with code ${code}`));
      } else {
        resolve();
      }
    });

    process.on('error', (error) => {
      reject(error);
    });

    return process;
  });
}

// Verificar si las dependencias están instaladas
async function checkDependencies() {
  console.log('📦 Verificando dependencias...');
  
  const fs = await import('fs');
  
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('❌ Dependencias del root no encontradas. Ejecuta: npm install');
    process.exit(1);
  }
  
  if (!fs.existsSync(path.join(__dirname, 'backend', 'node_modules'))) {
    console.log('❌ Dependencias del backend no encontradas. Ejecuta: cd backend && npm install');
    process.exit(1);
  }
  
  if (!fs.existsSync(path.join(__dirname, 'frontend', 'node_modules'))) {
    console.log('❌ Dependencias del frontend no encontradas. Ejecuta: cd frontend && npm install');
    process.exit(1);
  }
  
  console.log('✅ Todas las dependencias están instaladas');
}

async function startServices() {
  try {
    await checkDependencies();
    
    console.log('\n🎯 Iniciando servicios...\n');
    
    // Iniciar backend
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe',
      shell: true
    });
    
    // Iniciar frontend
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'pipe',
      shell: true
    });
    
    // Esperar un poco para que los servicios arranquen
    setTimeout(() => {
      // Iniciar proxy
      const proxy = spawn('node', ['dev-proxy.js'], {
        cwd: __dirname,
        stdio: 'pipe',
        shell: true
      });
      
      proxy.stdout.on('data', (data) => {
        console.log(`\x1b[35m[PROXY]\x1b[0m ${data.toString().trim()}`);
      });
      
      proxy.stderr.on('data', (data) => {
        console.log(`\x1b[35m[PROXY]\x1b[0m \x1b[31m${data.toString().trim()}\x1b[0m`);
      });
      
    }, 3000);
    
    // Manejar salida del backend
    backend.stdout.on('data', (data) => {
      console.log(`\x1b[32m[BACKEND]\x1b[0m ${data.toString().trim()}`);
    });
    
    backend.stderr.on('data', (data) => {
      console.log(`\x1b[32m[BACKEND]\x1b[0m \x1b[31m${data.toString().trim()}\x1b[0m`);
    });
    
    // Manejar salida del frontend
    frontend.stdout.on('data', (data) => {
      console.log(`\x1b[34m[FRONTEND]\x1b[0m ${data.toString().trim()}`);
    });
    
    frontend.stderr.on('data', (data) => {
      console.log(`\x1b[34m[FRONTEND]\x1b[0m \x1b[31m${data.toString().trim()}\x1b[0m`);
    });
    
    // Manejar Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Deteniendo servicios...');
      backend.kill();
      frontend.kill();
      process.exit(0);
    });
    
    console.log('\n✅ Servicios iniciados:');
    console.log('🌐 Aplicación completa: http://localhost:3000');
    console.log('🔧 Backend API: http://localhost:3001');
    console.log('⚛️ Frontend Dev: http://localhost:5173');
    console.log('\nPresiona Ctrl+C para detener todos los servicios.\n');
    
  } catch (error) {
    console.error('❌ Error iniciando servicios:', error.message);
    process.exit(1);
  }
}

startServices();