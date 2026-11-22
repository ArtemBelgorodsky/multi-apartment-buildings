import { categories, conditions } from './model.js'

const field = (key, label, options = {}) => ({ key, label, ...options })
const required = { required: true }
const numeric = { type: 'number', min: 0, step: 'any', required: true }
const pick = (options, required = true) => ({ options, required })
const link = (relation, required = true) => ({ relation, required })
const date = { type: 'date', required: true }
const memo = { type: 'textarea' }
const building = () => field('buildingCode', 'Дом', link('buildings'))
const system = () => field('systemCode', 'Инженерная система', link('systems', false))
const employee = () => field('assigneeCode', 'Исполнитель', link('employees', false))
const description = () => field('description', 'Описание', memo)
const cost = () => field('cost', 'Затраты, ₽', { ...numeric, default: 0 })

export const schemas = {
  buildings: {
    title: 'Жилой фонд', single: 'дом', heading: 'Карточка дома', icon: 'building', label: 'address',
    fields: [field('address', 'Адрес', required), field('district', 'Район', required), field('year', 'Год постройки', { ...numeric, min: 1800, step: 1 }), field('floors', 'Этажей', { ...numeric, min: 1, step: 1 }), field('entrances', 'Подъездов', { ...numeric, min: 1, step: 1 }), field('apartments', 'Квартир', { ...numeric, step: 1 }), field('area', 'Площадь, м²', numeric), field('condition', 'Состояние', pick(conditions)), description()],
    columns: ['address', 'district', 'year', 'condition'],
  },
  premises: {
    title: 'Помещения', single: 'помещение', heading: 'Карточка помещения', label: 'number',
    fields: [building(), field('number', 'Номер или обозначение', required), field('type', 'Тип', pick(['Квартира', 'Нежилое помещение', 'Техническое помещение'])), field('entrance', 'Подъезд', { ...numeric, min: 1, step: 1 }), field('floor', 'Этаж', { ...numeric, min: -10, step: 1 }), field('area', 'Площадь, м²', numeric), description()],
    columns: ['number', 'type', 'entrance', 'floor', 'area'],
  },
  systems: {
    title: 'Инженерные системы', single: 'систему', heading: 'Карточка системы', label: 'name',
    fields: [building(), field('name', 'Наименование', required), field('category', 'Категория', pick(categories)), field('condition', 'Состояние', pick(conditions)), field('inspectedOn', 'Последний осмотр', { type: 'date' }), description()],
    columns: ['name', 'category', 'condition', 'inspectedOn'],
  },
  employees: {
    title: 'Сотрудники', single: 'сотрудника', heading: 'Карточка сотрудника', icon: 'users', label: 'name',
    fields: [field('name', 'Имя и фамилия', required), field('position', 'Должность', required), field('email', 'Электронная почта', { type: 'email', required: true }), field('phone', 'Телефон', { type: 'tel' }), field('crewCode', 'Бригада', link('crews', false)), field('active', 'В штате', pick(['Да', 'Нет']))],
    columns: ['name', 'position', 'crewCode', 'phone', 'active'],
  },
  crews: {
    title: 'Бригады', single: 'бригаду', heading: 'Карточка бригады', label: 'name',
    fields: [field('name', 'Название', required), field('specialty', 'Специализация', pick(categories)), field('shift', 'График работы', required)],
    columns: ['name', 'specialty', 'shift'],
  },
  maintenance: {
    title: 'Техобслуживание', single: 'работу', heading: 'Плановая работа', icon: 'calendar', label: 'title',
    fields: [field('title', 'Наименование работ', required), building(), system(), employee(), field('dueOn', 'Дата работ', date), field('repeatDays', 'Повтор через дней (0 — однократно)', { ...numeric, step: 1, default: 0 }), field('status', 'Статус', pick(['Запланировано', 'В работе', 'Выполнено', 'Отменено'])), field('completedOn', 'Дата выполнения', { type: 'date' }), cost(), description()],
    columns: ['title', 'buildingCode', 'dueOn', 'assigneeCode', 'status'],
  },
  incidents: {
    title: 'Аварии', single: 'аварию', heading: 'Карточка аварии', icon: 'alarm', label: 'title',
    fields: [field('title', 'Что произошло', required), building(), system(), field('occurredOn', 'Дата происшествия', date), field('severity', 'Приоритет', pick(['Аварийный', 'Высокий', 'Обычный'])), field('status', 'Статус', pick(['Зафиксирована', 'Локализация', 'Устранена'])), field('resolvedOn', 'Дата устранения', { type: 'date' }), cost(), description()],
    columns: ['title', 'buildingCode', 'occurredOn', 'severity', 'status'],
  },
  materials: {
    title: 'Склад', single: 'материал', heading: 'Карточка материала', icon: 'box', label: 'name',
    fields: [field('name', 'Наименование', required), field('unit', 'Единица учёта', pick(['шт.', 'м', 'кг', 'л', 'компл.'])), field('initialQuantity', 'Начальный остаток', numeric), field('minQuantity', 'Минимальный остаток', numeric), field('price', 'Стоимость за единицу, ₽', numeric)],
    columns: ['name', 'unit', 'available', 'minQuantity', 'price'],
  },
  stock_moves: {
    title: 'Движение материалов', single: 'движение', heading: 'Складская операция', label: 'type',
    fields: [field('materialCode', 'Материал', link('materials')), field('type', 'Операция', pick(['Приход', 'Расход'])), field('quantity', 'Количество', { ...numeric, min: 0.01 }), field('occurredOn', 'Дата операции', date), description()],
    columns: ['occurredOn', 'materialCode', 'type', 'quantity', 'description'],
  },
}

export const descriptions = {
  tickets: 'Обращения жителей, сроки и исполнители',
  buildings: 'Дома, помещения и инженерные системы',
  maintenance: 'График регламентных работ и история обслуживания',
  incidents: 'Журнал аварийных ситуаций и ход устранения',
  employees: 'Контакты сотрудников и состав эксплуатационных бригад',
  materials: 'Остатки, приход и расход материалов',
  analytics: 'Нагрузка, сроки выполнения и эксплуатационные затраты',
}
