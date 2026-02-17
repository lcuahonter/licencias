pipeline {
    agent any
    
    // Configuración de herramientas
    tools {
        nodejs 'NodeJS-18' // Configurar en Jenkins: Manage Jenkins > Tools
    }
    
    // Variables de entorno
    environment {
        // AZURE_SUBSCRIPTION_ID = credentials('azure-subscription-id')
        // AZURE_RESOURCE_GROUP = 'licencias-rg'
        // AZURE_STATIC_WEB_APP = 'licencias-durango'
        NODE_ENV = 'production'
    }
    
    // Opciones del pipeline
    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    // Triggers - ejecutar en cada push o PR
    triggers {
        githubPush()
    }
    
    stages {
        stage('🔍 Checkout') {
            steps {
                echo '📥 Descargando código fuente...'
                checkout scm
                sh 'git log -1 --oneline'
            }
        }
        
        stage('📦 Install Dependencies') {
            steps {
                echo '📦 Instalando dependencias...'
                nodejs('NodeJS-18') {
                    sh 'npm ci' // más rápido y determinista que npm install
                }
            }
        }
        
        stage('🔎 Lint & Type Check') {
            steps {
                echo '🔍 Verificando calidad de código...'
                nodejs('NodeJS-18') {
                    sh 'npm run lint || true' // Si tienes lint configurado
                    // sh 'npm run type-check || true' // Si tienes type-check
                }
            }
        }
        
        stage('🏗️ Build') {
            steps {
                echo '🏗️ Construyendo aplicación...'
                nodejs('NodeJS-18') {
                    sh 'npm run build'
                }
            }
        }
        
        stage('🧪 Tests') {
            steps {
                echo '🧪 Ejecutando tests...'
                // Descomentar cuando tengas tests
                // sh 'npm test -- --coverage --watchAll=false'
                echo '⚠️ Tests no configurados aún'
            }
        }
        
        stage('📊 Quality Gate') {
            steps {
                echo '📊 Verificando métricas de calidad...'
                // Aquí puedes integrar SonarQube si lo tienes
                sh '''
                    echo "Build size:"
                    du -sh dist/
                    echo "File count:"
                    find dist/ -type f | wc -l
                '''
            }
        }
        
        stage('🚀 Deploy to Azure') {
            when {
                branch 'MainLicencias' // Solo deploy desde la rama principal
            }
            steps {
                echo '🚀 Desplegando a Azure Static Web Apps...'
                script {
                    // Opción 1: Usar Azure CLI
                    sh '''
                        # Instalar Azure CLI si no está disponible
                        # curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
                        
                        # Login con Service Principal (configurar credentials en Jenkins)
                        # az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID
                        
                        # Deploy
                        # az staticwebapp deploy --name $AZURE_STATIC_WEB_APP --resource-group $AZURE_RESOURCE_GROUP --app-location dist/
                        
                        echo "⚠️ Configurar credenciales de Azure en Jenkins"
                    '''
                    
                    // Opción 2: Usar GitHub Actions Token (si Azure SWA está configurado con GitHub)
                    // Ya que actualmente usas GitHub Actions, podrías mantener ese flujo
                    echo "💡 Alternativa: Mantener deploy con GitHub Actions y Jenkins solo para CI"
                }
            }
        }
    }
    
    post {
        success {
            echo '✅ Pipeline ejecutado exitosamente!'
            // Notificación (email, Slack, etc.)
            // emailext subject: "✅ Build #${BUILD_NUMBER} - SUCCESS",
            //          body: "El build se completó exitosamente",
            //          to: "equipo@example.com"
        }
        
        failure {
            echo '❌ Pipeline falló!'
            // Notificación de error
            // emailext subject: "❌ Build #${BUILD_NUMBER} - FAILED",
            //          body: "El build falló. Ver logs: ${BUILD_URL}",
            //          to: "equipo@example.com"
        }
        
        always {
            echo '🧹 Limpiando workspace...'
            // Archivar artifacts
            archiveArtifacts artifacts: 'dist/**/*', allowEmptyArchive: true, fingerprint: true
            
            // Limpiar node_modules para ahorrar espacio
            sh 'rm -rf node_modules || true'
        }
    }
}
