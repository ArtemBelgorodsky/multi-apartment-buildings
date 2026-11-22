<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({ mode: String, error: String, busy: Boolean })
defineEmits(['switch', 'submit'])
const fullName = defineModel('fullName', { type: String, required: true })
const email = defineModel('email', { type: String, required: true })
const password = defineModel('password', { type: String, required: true })
const registering = computed(() => props.mode === 'register')
</script>

<template>
  <form class="account-form" @submit.prevent="$emit('submit')">
    <header class="auth-heading">
      <div>
        <h1>{{ registering ? 'Регистрация жителя' : 'Вход в «Контур»' }}</h1>
        <p>{{ registering ? 'Создайте аккаунт, чтобы подавать заявки и отслеживать их выполнение.' : 'Войдите, чтобы открыть своё рабочее пространство.' }}</p>
      </div>
    </header>
    <div class="auth-fields">
      <label v-if="registering"><span>Имя и фамилия</span><input v-model="fullName" autocomplete="name" maxlength="120" required :disabled="busy" /></label>
      <label><span>Электронная почта</span><input v-model="email" type="email" autocomplete="username" autocapitalize="none" required :disabled="busy" /></label>
      <label><span>Пароль</span><input v-model="password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" required :disabled="busy" /></label>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <button type="submit" class="button primary auth-submit" :disabled="busy">
      {{ busy ? 'Подключение…' : registering ? 'Создать аккаунт' : 'Войти' }} <Icon name="arrow" :size="16" />
    </button>
    <div class="auth-switch">
      <span>{{ registering ? 'Уже есть аккаунт?' : 'Впервые в «Контуре»?' }}</span>
      <button type="button" class="text-link" :disabled="busy" @click="$emit('switch', registering ? 'signin' : 'register')">{{ registering ? 'Войти' : 'Зарегистрироваться' }}</button>
    </div>
  </form>
</template>
