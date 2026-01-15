<template>
  <div class="home">
    <!-- 登录界面 -->
    <div v-if="!loginStatus" class="login-container">
      <el-card class="login-card">
        <template #header>
          <div class="card-header">
            <span>用户登录</span>
          </div>
        </template>
        <el-form :model="loginForm" label-width="80px">
          <el-form-item label="服务器">
            <el-input
              v-model="loginForm.baseUrl"
              placeholder="请输入服务器地址"
            />
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="loginForm.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="验证码">
            <div class="captcha-container">
              <el-image
                v-if="captchaImage"
                :src="captchaImage"
                fit="contain"
                class="captcha-image"
                @click="getCaptcha"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>加载失败</span>
                  </div>
                </template>
              </el-image>
              <el-button
                type="primary"
                @click="getCaptcha"
                :loading="loadingCaptcha"
              >
                {{ captchaImage ? '刷新验证码' : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="验证码">
            <el-input
              v-model="loginForm.code"
              placeholder="请输入验证码"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              @click="handleLogin"
              :loading="loggingIn"
              :disabled="!loginForm.code"
              style="width: 100%"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
    <div v-else class="welcome-container">
      <el-result icon="success" title="登录成功"> </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { ipcManager } from '../utils/ipcManager'
import { apiManager } from '../utils/api'
import { Config } from 'aircraft-rs'

const loginStatus = ref(false)

const loginForm = ref({
  baseUrl: '',
  username: '',
  password: '',
  code: '',
})

const captchaImage = ref('')
const loadingCaptcha = ref(false)
const loggingIn = ref(false)
const serverPort = ref(25455)

const getCaptcha = async () => {
  loadingCaptcha.value = true
  try {
    const data = await apiManager.post('/get-captcha', loginForm.value.baseUrl)
    if (data.img) {
      captchaImage.value = data.img
      loginForm.value.code = '' // 清空验证码输入
    } else if (data.message) {
      ElMessage.error(data.message)
    }
  } catch (error) {
    ElMessage.error('获取验证码失败: ' + error)
  } finally {
    loadingCaptcha.value = false
  }
}

const handleLogin = async () => {
  if (
    loginForm.value.code.length === 0 ||
    !loginForm.value.baseUrl ||
    !loginForm.value.username ||
    !loginForm.value.password
  ) {
    ElMessage.warning('请填充完整的登录信息')
    return
  }

  await saveLoginInfo()
  loggingIn.value = true
  try {
    // 使用用户在表单中填写或修改的账号密码
    const response = await fetch(`http://127.0.0.1:${serverPort.value}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: loginForm.value.code,
        username: loginForm.value.username,
        password: loginForm.value.password,
        baseUrl: loginForm.value.baseUrl,
      }),
    })

    const data = await response.json()

    if (data.success) {
      ElMessage.success('登录成功')
    } else if (data.message) {
      ElMessage.error(data.message)
      // 登录失败后重新获取验证码
      getCaptcha()
    }
  } catch (error) {
    ElMessage.error('登录失败: ' + error)
    getCaptcha()
  } finally {
    loggingIn.value = false
  }
}

async function saveLoginInfo() {
  let oldConfig: Config = await apiManager.get('/get-config')
  oldConfig.server.baseUrl = loginForm.value.baseUrl
  oldConfig.server.username = loginForm.value.username
  oldConfig.server.password = loginForm.value.password
  oldConfig.server.debug = false
  await apiManager.post('/save-config', oldConfig)
}

onMounted(async () => {
  const config = await apiManager.get('/get-config')
  if (config?.server) {
    loginForm.value.baseUrl = config.server.baseUrl || ''
    loginForm.value.username = config.server.username || ''
    loginForm.value.password = config.server.password || ''
  }
})

setInterval(async () => {
  loginStatus.value = await ipcManager.invoke('get_login_status')
}, 200)
</script>

<style scoped>
.home {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-container {
  margin-top: 20px;
  width: 100%;
  max-width: 400px;
}

.login-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}

.captcha-container {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.captcha-image {
  width: 150px;
  height: 50px;
  cursor: pointer;
  border-radius: 4px;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome-container {
  margin-top: 50px;
}

:deep(.el-card) {
  background: #363636;
}
</style>
