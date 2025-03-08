// load-test.js
import fs from 'fs';
import path from 'path';
import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const config = {
  // URL de conexión a RabbitMQ (ajusta según tu entorno)
  rabbitMqUrl: 'amqps://xrcatfrd:g6H0TN8tE9pXOsCFIN5e2oPwFCn6KSci@shrimp.rmq.cloudamqp.com/xrcatfrd',
  
  // Cola a la que enviar los mensajes
  queue: 'files_queue',
  
  // Ruta a la carpeta con archivos de prueba
  testFilesDir: path.join(__dirname, 'test-files'),
  
  // Número de solicitudes simultáneas
  concurrentRequests: 10,
  
  // Total de solicitudes a enviar
  totalRequests: 50,
  
  // ID de tenant para pruebas
  tenantId: 'test-tenant',
  
  // Proveedor de almacenamiento a usar
  provider: 'firebase',
  
  // Intervalo entre lotes de solicitudes (ms)
  batchInterval: 1000
};

// Variables globales
let channel;
let connection;
let sentRequests = 0;
let completedRequests = 0;
let failedRequests = 0;
let startTime;

// Función auxiliar para leer un archivo aleatorio del directorio de prueba
function getRandomTestFile() {
  const files = fs.readdirSync(config.testFilesDir);
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return {
    buffer: fs.readFileSync(path.join(config.testFilesDir, randomFile)),
    originalname: randomFile,
    mimetype: getMimeType(randomFile)
  };
}

// Función para determinar el tipo MIME basado en la extensión del archivo
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

// Función para crear un mensaje optimizado con buffer en base64
function createOptimizedMessage() {
  const file = getRandomTestFile();
  
  return {
    file: {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.buffer.length,
      bufferBase64: file.buffer.toString('base64')
    },
    tenantId: config.tenantId,
    provider: config.provider,
    correlationId: uuidv4()
  };
}

// Función para enviar una solicitud de subida de archivo
async function sendUploadRequest() {
  const message = createOptimizedMessage();
  const correlationId = message.correlationId;
  
  try {
    channel.publish(
      '',
      config.queue,
      Buffer.from(JSON.stringify(message)),
      {
        contentType: 'application/json',
        correlationId: correlationId,
        replyTo: 'amq.rabbitmq.reply-to'
      }
    );
    
    sentRequests++;
    console.log(`Solicitud enviada: ${correlationId} - Archivo: ${message.file.originalname}`);
  } catch (error) {
    failedRequests++;
    console.error(`Error al enviar solicitud ${correlationId}:`, error);
  }
}

// Función para enviar un lote de solicitudes
async function sendBatch(batchSize) {
  console.log(`Enviando lote de ${batchSize} solicitudes...`);
  
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(sendUploadRequest());
  }
  
  await Promise.all(promises);
}

// Función principal para ejecutar la prueba de carga
async function runLoadTest() {
  try {
    // Verificar que existe el directorio de archivos de prueba
    if (!fs.existsSync(config.testFilesDir)) {
      console.error(`El directorio de archivos de prueba '${config.testFilesDir}' no existe.`);
      console.info('Crea el directorio e incluye archivos para pruebas (imágenes, PDFs, etc.)');
      return;
    }
    
    // Conectar a RabbitMQ
    console.log(`Conectando a RabbitMQ en ${config.rabbitMqUrl}...`);
    connection = await amqp.connect(config.rabbitMqUrl);
    channel = await connection.createChannel();
    
    // Consumir mensajes de respuesta para contar completados
    await channel.consume(
      'amq.rabbitmq.reply-to',
      (msg) => {
        if (msg) {
          completedRequests++;
          const correlationId = msg.properties.correlationId;
          const response = JSON.parse(msg.content.toString());
          console.log(`Respuesta recibida: ${correlationId} - Filename: ${response.filename}`);
          
          // Si hemos completado todas las solicitudes, cerrar la conexión
          if (completedRequests + failedRequests >= config.totalRequests) {
            finishTest();
          }
        }
      },
      { noAck: true }
    );
    
    // Iniciar cronómetro
    startTime = Date.now();
    console.log(`Iniciando prueba de carga con ${config.totalRequests} solicitudes...`);
    
    // Enviar solicitudes en lotes
    let remainingRequests = config.totalRequests;
    
    while (remainingRequests > 0) {
      const batchSize = Math.min(config.concurrentRequests, remainingRequests);
      await sendBatch(batchSize);
      remainingRequests -= batchSize;
      
      if (remainingRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, config.batchInterval));
      }
    }
    
    // Establecer un tiempo límite para la prueba (5 minutos)
    setTimeout(() => {
      if (connection.isOpen) {
        console.log('Tiempo límite alcanzado. Cerrando la prueba.');
        finishTest();
      }
    }, 5 * 60 * 1000);
    
  } catch (error) {
    console.error('Error al ejecutar la prueba de carga:', error);
    
    if (connection && connection.isOpen) {
      await connection.close();
    }
    
    process.exit(1);
  }
}

// Función para finalizar la prueba y mostrar resultados
function finishTest() {
  const duration = (Date.now() - startTime) / 1000; // en segundos
  
  console.log('\n--- Resultados de la prueba de carga ---');
  console.log(`Duración total: ${duration.toFixed(2)} segundos`);
  console.log(`Solicitudes enviadas: ${sentRequests}`);
  console.log(`Solicitudes completadas: ${completedRequests}`);
  console.log(`Solicitudes fallidas: ${failedRequests}`);
  
  const throughput = completedRequests / duration;
  console.log(`Throughput: ${throughput.toFixed(2)} solicitudes/segundo`);
  
  if (completedRequests > 0) {
    const avgTime = duration / completedRequests;
    console.log(`Tiempo promedio por solicitud: ${avgTime.toFixed(2)} segundos`);
  }
  
  // Cerrar conexión
  connection.close().then(() => {
    console.log('Prueba finalizada.');
    process.exit(0);
  });
}

// Ejecutar la prueba
runLoadTest().catch(console.error);