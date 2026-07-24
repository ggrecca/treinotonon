import { EXERCISE_LIBRARY_VARIANTS } from "./exerciseLibraryVariants.js";

// Catalogo base de exercicios do Treino Tonon.
// Mantem apenas dados tecnicos de exercicios; prescricoes ficam nos treinos.

export const EXERCISE_LIBRARY_RAW = [
  {
    "name": "Supino Reto com Barra",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "tags": [
      "barra",
      "banco",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press horizontal para peitoral. Manter escápulas retraídas, pés firmes e controlar a descida até amplitude confortável.",
    "equipmentList": [],
    "technicalNotes": "Press horizontal para peitoral. Manter escápulas retraídas, pés firmes e controlar a descida até amplitude confortável."
  },
  {
    "name": "Supino Inclinado com Barra",
    "category": "Peito",
    "primaryGroup": "Peitoral superior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "tags": [
      "barra",
      "banco inclinado",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press inclinado com ênfase na porção superior do peitoral. Evitar abrir demais os cotovelos e manter controle da barra.",
    "equipmentList": [],
    "technicalNotes": "Press inclinado com ênfase na porção superior do peitoral. Evitar abrir demais os cotovelos e manter controle da barra."
  },
  {
    "name": "Supino Declinado com Barra",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "tags": [
      "barra",
      "banco declinado",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press declinado para peitoral inferior. Priorizar estabilidade do tronco e trajetória controlada.",
    "equipmentList": [],
    "technicalNotes": "Press declinado para peitoral inferior. Priorizar estabilidade do tronco e trajetória controlada."
  },
  {
    "name": "Supino Reto com Halteres",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "tags": [
      "halteres",
      "banco",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Variação com maior liberdade de movimento. Descer os halteres com controle e manter punhos alinhados.",
    "equipmentList": [],
    "technicalNotes": "Variação com maior liberdade de movimento. Descer os halteres com controle e manter punhos alinhados."
  },
  {
    "name": "Supino Inclinado com Halteres",
    "category": "Peito",
    "primaryGroup": "Peitoral superior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "tags": [
      "halteres",
      "banco inclinado",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Variação inclinada com halteres. Boa para trabalhar amplitude, controle e simetria entre os lados.",
    "equipmentList": [],
    "technicalNotes": "Variação inclinada com halteres. Boa para trabalhar amplitude, controle e simetria entre os lados."
  },
  {
    "name": "Supino Vertical Máquina",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press sentado guiado. Útil para estabilidade e progressão de carga com menor exigência técnica.",
    "equipmentList": [],
    "technicalNotes": "Press sentado guiado. Útil para estabilidade e progressão de carga com menor exigência técnica."
  },
  {
    "name": "Supino Convergente Máquina",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "tags": [
      "máquina",
      "convergente",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press em máquina convergente. Ajustar banco para alinhar pegadores ao peitoral e evitar elevação dos ombros.",
    "equipmentList": [],
    "technicalNotes": "Press em máquina convergente. Ajustar banco para alinhar pegadores ao peitoral e evitar elevação dos ombros."
  },
  {
    "name": "Crucifixo Reto com Halteres",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "tags": [
      "halteres",
      "banco",
      "livre",
      "bilateral",
      "isolador",
      "adução horizontal"
    ],
    "notes": "Exercício isolador para peitoral. Manter leve flexão dos cotovelos e controlar a abertura sem forçar ombros.",
    "equipmentList": [],
    "technicalNotes": "Exercício isolador para peitoral. Manter leve flexão dos cotovelos e controlar a abertura sem forçar ombros."
  },
  {
    "name": "Crucifixo Inclinado com Halteres",
    "category": "Peito",
    "primaryGroup": "Peitoral superior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "tags": [
      "halteres",
      "banco inclinado",
      "livre",
      "bilateral",
      "isolador",
      "adução horizontal"
    ],
    "notes": "Isolador com ênfase na parte superior do peitoral. Usar carga moderada e amplitude segura.",
    "equipmentList": [],
    "technicalNotes": "Isolador com ênfase na parte superior do peitoral. Usar carga moderada e amplitude segura."
  },
  {
    "name": "Peck Deck / Fly Máquina",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "adução horizontal"
    ],
    "notes": "Fly guiado para peitoral. Manter tronco apoiado e aproximar os braços sem perder controle na volta.",
    "equipmentList": [],
    "technicalNotes": "Fly guiado para peitoral. Manter tronco apoiado e aproximar os braços sem perder controle na volta."
  },
  {
    "name": "Crossover Alto no Cabo",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "tags": [
      "cabo",
      "polia",
      "bilateral",
      "isolador",
      "adução"
    ],
    "notes": "Crossover de cima para baixo com ênfase em fibras inferiores. Evitar balanço do tronco.",
    "equipmentList": [],
    "technicalNotes": "Crossover de cima para baixo com ênfase em fibras inferiores. Evitar balanço do tronco."
  },
  {
    "name": "Crossover Baixo no Cabo",
    "category": "Peito",
    "primaryGroup": "Peitoral superior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "tags": [
      "cabo",
      "polia",
      "bilateral",
      "isolador",
      "adução"
    ],
    "notes": "Crossover de baixo para cima com ênfase em peitoral superior. Manter movimento fluido e cotovelos semi-flexionados.",
    "equipmentList": [],
    "technicalNotes": "Crossover de baixo para cima com ênfase em peitoral superior. Manter movimento fluido e cotovelos semi-flexionados."
  },
  {
    "name": "Flexão de Braços",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior",
      "Core"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Empurrar com peso corporal. Manter corpo alinhado e adaptar inclinação conforme nível do aluno.",
    "equipmentList": [],
    "technicalNotes": "Empurrar com peso corporal. Manter corpo alinhado e adaptar inclinação conforme nível do aluno."
  },
  {
    "name": "Puxada Alta Frente Aberta",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Bíceps",
      "Redondo maior"
    ],
    "tags": [
      "cabo",
      "polia",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Puxada vertical para dorsais. Levar a barra à frente com peito aberto e evitar puxar atrás da nuca.",
    "equipmentList": [],
    "technicalNotes": "Puxada vertical para dorsais. Levar a barra à frente com peito aberto e evitar puxar atrás da nuca."
  },
  {
    "name": "Puxada Alta Supinada",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Bíceps",
      "Braquial"
    ],
    "tags": [
      "cabo",
      "polia",
      "bilateral",
      "composto",
      "puxar",
      "pegada supinada"
    ],
    "notes": "Puxada vertical com pegada supinada. Facilita participação do bíceps e exige controle escapular.",
    "equipmentList": [],
    "technicalNotes": "Puxada vertical com pegada supinada. Facilita participação do bíceps e exige controle escapular."
  },
  {
    "name": "Puxada Alta Neutra Triângulo",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Bíceps",
      "Romboides"
    ],
    "tags": [
      "cabo",
      "polia",
      "triângulo",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Puxada com pegada neutra. Manter peito alto e puxar os cotovelos para baixo.",
    "equipmentList": [],
    "technicalNotes": "Puxada com pegada neutra. Manter peito alto e puxar os cotovelos para baixo."
  },
  {
    "name": "Barra Fixa Pronada",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Bíceps",
      "Core"
    ],
    "tags": [
      "peso corporal",
      "barra fixa",
      "livre",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Puxada vertical com peso corporal. Controlar subida e descida sem balanço excessivo.",
    "equipmentList": [],
    "technicalNotes": "Puxada vertical com peso corporal. Controlar subida e descida sem balanço excessivo."
  },
  {
    "name": "Barra Fixa Supinada",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Bíceps",
      "Braquial"
    ],
    "tags": [
      "peso corporal",
      "barra fixa",
      "livre",
      "bilateral",
      "composto",
      "puxar",
      "pegada supinada"
    ],
    "notes": "Variação de barra fixa com maior participação do bíceps. Manter amplitude controlada.",
    "equipmentList": [],
    "technicalNotes": "Variação de barra fixa com maior participação do bíceps. Manter amplitude controlada."
  },
  {
    "name": "Remada Curvada com Barra",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio",
      "Bíceps",
      "Lombar"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Remada livre para dorsais e parte média das costas. Manter coluna neutra e tronco estável.",
    "equipmentList": [],
    "technicalNotes": "Remada livre para dorsais e parte média das costas. Manter coluna neutra e tronco estável."
  },
  {
    "name": "Remada Cavalinho / T-Bar",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio",
      "Bíceps"
    ],
    "tags": [
      "barra",
      "máquina",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Remada com apoio ou barra articulada. Puxar com cotovelos e evitar encolher os ombros.",
    "equipmentList": [],
    "technicalNotes": "Remada com apoio ou barra articulada. Puxar com cotovelos e evitar encolher os ombros."
  },
  {
    "name": "Remada Baixa no Cabo",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio",
      "Bíceps"
    ],
    "tags": [
      "cabo",
      "polia",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Remada horizontal no cabo. Manter tronco estável e finalizar com escápulas aproximadas.",
    "equipmentList": [],
    "technicalNotes": "Remada horizontal no cabo. Manter tronco estável e finalizar com escápulas aproximadas."
  },
  {
    "name": "Remada Máquina",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio",
      "Bíceps"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Remada guiada. Ajustar apoio do peito e puxadores para manter trajetória confortável.",
    "equipmentList": [],
    "technicalNotes": "Remada guiada. Ajustar apoio do peito e puxadores para manter trajetória confortável."
  },
  {
    "name": "Remada Unilateral com Halter / Serrote",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Romboides",
      "Bíceps",
      "Core"
    ],
    "tags": [
      "halteres",
      "banco",
      "livre",
      "unilateral",
      "composto",
      "puxar"
    ],
    "notes": "Remada unilateral para controle e correção de assimetrias. Evitar girar o tronco.",
    "equipmentList": [],
    "technicalNotes": "Remada unilateral para controle e correção de assimetrias. Evitar girar o tronco."
  },
  {
    "name": "Remada Articulada Unilateral",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio",
      "Bíceps"
    ],
    "tags": [
      "máquina",
      "unilateral",
      "composto",
      "puxar"
    ],
    "notes": "Remada em máquina articulada. Boa para foco em cada lado e estabilidade do tronco.",
    "equipmentList": [],
    "technicalNotes": "Remada em máquina articulada. Boa para foco em cada lado e estabilidade do tronco."
  },
  {
    "name": "Pulldown Braços Retos",
    "category": "Costas",
    "primaryGroup": "Dorsal",
    "secondaryGroups": [
      "Redondo maior",
      "Core"
    ],
    "tags": [
      "cabo",
      "polia",
      "bilateral",
      "isolador",
      "puxar"
    ],
    "notes": "Isolador para dorsais com braços quase estendidos. Evitar transformar em tríceps ou balançar o tronco.",
    "equipmentList": [],
    "technicalNotes": "Isolador para dorsais com braços quase estendidos. Evitar transformar em tríceps ou balançar o tronco."
  },
  {
    "name": "Encolhimento com Halteres",
    "category": "Costas",
    "primaryGroup": "Trapézio superior",
    "secondaryGroups": [
      "Antebraço"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Elevação escapular para trapézio superior. Subir e descer em linha reta, sem rotação dos ombros.",
    "equipmentList": [],
    "technicalNotes": "Elevação escapular para trapézio superior. Subir e descer em linha reta, sem rotação dos ombros."
  },
  {
    "name": "Hiperextensão Lombar",
    "category": "Costas",
    "primaryGroup": "Lombar",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa"
    ],
    "tags": [
      "banco romano",
      "peso corporal",
      "livre",
      "bilateral",
      "composto"
    ],
    "notes": "Extensão de tronco para lombar e cadeia posterior. Manter controle e evitar hiperextensão agressiva.",
    "equipmentList": [],
    "technicalNotes": "Extensão de tronco para lombar e cadeia posterior. Manter controle e evitar hiperextensão agressiva."
  },
  {
    "name": "Agachamento Livre",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa",
      "Core"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "agachar"
    ],
    "notes": "Exercício base para membros inferiores. Manter coluna neutra, joelhos alinhados e profundidade segura.",
    "equipmentList": [],
    "technicalNotes": "Exercício base para membros inferiores. Manter coluna neutra, joelhos alinhados e profundidade segura."
  },
  {
    "name": "Agachamento no Smith",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa"
    ],
    "tags": [
      "máquina",
      "barra guiada",
      "bilateral",
      "composto",
      "agachar"
    ],
    "notes": "Agachamento guiado. Ajustar posição dos pés para conforto e não relaxar o controle do tronco.",
    "equipmentList": [],
    "technicalNotes": "Agachamento guiado. Ajustar posição dos pés para conforto e não relaxar o controle do tronco."
  },
  {
    "name": "Agachamento Hack",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "composto",
      "agachar"
    ],
    "notes": "Agachamento em máquina com ênfase em quadríceps. Controlar amplitude e alinhamento dos joelhos.",
    "equipmentList": [],
    "technicalNotes": "Agachamento em máquina com ênfase em quadríceps. Controlar amplitude e alinhamento dos joelhos."
  },
  {
    "name": "Agachamento Frontal",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Core",
      "Costas"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "agachar"
    ],
    "notes": "Variação com tronco mais vertical. Exige mobilidade e controle do core.",
    "equipmentList": [],
    "technicalNotes": "Variação com tronco mais vertical. Exige mobilidade e controle do core."
  },
  {
    "name": "Leg Press 45",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press de pernas inclinado. Não travar joelhos com força e manter lombar apoiada.",
    "equipmentList": [],
    "technicalNotes": "Press de pernas inclinado. Não travar joelhos com força e manter lombar apoiada."
  },
  {
    "name": "Leg Press Horizontal",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press de pernas horizontal. Ajustar banco para permitir boa amplitude sem tirar quadril do apoio.",
    "equipmentList": [],
    "technicalNotes": "Press de pernas horizontal. Ajustar banco para permitir boa amplitude sem tirar quadril do apoio."
  },
  {
    "name": "Cadeira Extensora",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "extensão de joelho"
    ],
    "notes": "Isolador para quadríceps. Controlar a subida e a descida, evitando impulso.",
    "equipmentList": [],
    "technicalNotes": "Isolador para quadríceps. Controlar a subida e a descida, evitando impulso."
  },
  {
    "name": "Afundo com Halteres",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa",
      "Core"
    ],
    "tags": [
      "halteres",
      "livre",
      "unilateral",
      "composto"
    ],
    "notes": "Exercício unilateral para pernas e glúteos. Manter tronco estável e joelho alinhado.",
    "equipmentList": [],
    "technicalNotes": "Exercício unilateral para pernas e glúteos. Manter tronco estável e joelho alinhado."
  },
  {
    "name": "Avanço / Passada",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa",
      "Core"
    ],
    "tags": [
      "halteres",
      "livre",
      "unilateral",
      "composto"
    ],
    "notes": "Passada dinâmica ou estacionária. Usar amplitude controlada e evitar desequilíbrio.",
    "equipmentList": [],
    "technicalNotes": "Passada dinâmica ou estacionária. Usar amplitude controlada e evitar desequilíbrio."
  },
  {
    "name": "Agachamento Búlgaro",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa",
      "Core"
    ],
    "tags": [
      "halteres",
      "banco",
      "livre",
      "unilateral",
      "composto"
    ],
    "notes": "Unilateral avançado para pernas e glúteos. Priorizar estabilidade antes de carga.",
    "equipmentList": [],
    "technicalNotes": "Unilateral avançado para pernas e glúteos. Priorizar estabilidade antes de carga."
  },
  {
    "name": "Step-Up no Banco",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Core"
    ],
    "tags": [
      "halteres",
      "banco",
      "livre",
      "unilateral",
      "composto"
    ],
    "notes": "Subida no banco para controle unilateral. Empurrar pelo pé apoiado e evitar impulso da perna de trás.",
    "equipmentList": [],
    "technicalNotes": "Subida no banco para controle unilateral. Empurrar pelo pé apoiado e evitar impulso da perna de trás."
  },
  {
    "name": "Cadeira Adutora",
    "category": "Pernas",
    "primaryGroup": "Adutores",
    "secondaryGroups": [],
    "tags": [
      "máquina",
      "bilateral",
      "isolador"
    ],
    "notes": "Isolador para adutores. Controlar amplitude e evitar fechamento brusco.",
    "equipmentList": [],
    "technicalNotes": "Isolador para adutores. Controlar amplitude e evitar fechamento brusco."
  },
  {
    "name": "Mesa Flexora",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Panturrilha"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "flexão de joelho"
    ],
    "notes": "Isolador para posteriores. Manter quadril apoiado e controlar a fase excêntrica.",
    "equipmentList": [],
    "technicalNotes": "Isolador para posteriores. Manter quadril apoiado e controlar a fase excêntrica."
  },
  {
    "name": "Cadeira Flexora",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Panturrilha"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "flexão de joelho"
    ],
    "notes": "Flexão de joelho sentado. Ajustar eixo do equipamento ao joelho e evitar compensações.",
    "equipmentList": [],
    "technicalNotes": "Flexão de joelho sentado. Ajustar eixo do equipamento ao joelho e evitar compensações."
  },
  {
    "name": "Flexora em Pé Unilateral",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Panturrilha"
    ],
    "tags": [
      "máquina",
      "unilateral",
      "isolador",
      "flexão de joelho"
    ],
    "notes": "Flexora unilateral para correção de assimetrias. Manter quadril fixo e movimento controlado.",
    "equipmentList": [],
    "technicalNotes": "Flexora unilateral para correção de assimetrias. Manter quadril fixo e movimento controlado."
  },
  {
    "name": "Stiff com Barra",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Glúteos",
      "Lombar",
      "Core"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "hinge"
    ],
    "notes": "Padrão de dobradiça de quadril. Manter coluna neutra e sentir alongamento nos posteriores.",
    "equipmentList": [],
    "technicalNotes": "Padrão de dobradiça de quadril. Manter coluna neutra e sentir alongamento nos posteriores."
  },
  {
    "name": "Stiff com Halteres",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Glúteos",
      "Lombar",
      "Core"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "composto",
      "hinge"
    ],
    "notes": "Variação com halteres para posteriores. Descer com controle mantendo os halteres próximos ao corpo.",
    "equipmentList": [],
    "technicalNotes": "Variação com halteres para posteriores. Descer com controle mantendo os halteres próximos ao corpo."
  },
  {
    "name": "Terra Romeno",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Glúteos",
      "Lombar",
      "Core"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "hinge"
    ],
    "notes": "Variação de levantamento com ênfase excêntrica em posteriores. Evitar arredondar a lombar.",
    "equipmentList": [],
    "technicalNotes": "Variação de levantamento com ênfase excêntrica em posteriores. Evitar arredondar a lombar."
  },
  {
    "name": "Levantamento Terra Tradicional",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Glúteos",
      "Lombar",
      "Core"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "hinge"
    ],
    "notes": "Movimento global de cadeia posterior. Exige técnica, tensão de tronco e progressão conservadora.",
    "equipmentList": [],
    "technicalNotes": "Movimento global de cadeia posterior. Exige técnica, tensão de tronco e progressão conservadora."
  },
  {
    "name": "Elevação Pélvica com Barra",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Posterior de coxa",
      "Core"
    ],
    "tags": [
      "barra",
      "banco",
      "livre",
      "bilateral",
      "composto"
    ],
    "notes": "Exercício forte para glúteos. Fazer retroversão pélvica no topo e evitar hiperextensão lombar.",
    "equipmentList": [],
    "technicalNotes": "Exercício forte para glúteos. Fazer retroversão pélvica no topo e evitar hiperextensão lombar."
  },
  {
    "name": "Hip Thrust Máquina",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Posterior de coxa"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "composto"
    ],
    "notes": "Elevação pélvica guiada. Ajustar apoio e priorizar contração máxima no topo.",
    "equipmentList": [],
    "technicalNotes": "Elevação pélvica guiada. Ajustar apoio e priorizar contração máxima no topo."
  },
  {
    "name": "Glúteo no Cabo",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Posterior de coxa",
      "Core"
    ],
    "tags": [
      "cabo",
      "polia",
      "unilateral",
      "isolador"
    ],
    "notes": "Extensão de quadril unilateral no cabo. Manter tronco estável e evitar arquear a lombar.",
    "equipmentList": [],
    "technicalNotes": "Extensão de quadril unilateral no cabo. Manter tronco estável e evitar arquear a lombar."
  },
  {
    "name": "Coice Glúteo Máquina",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Posterior de coxa",
      "Core"
    ],
    "tags": [
      "máquina",
      "unilateral",
      "isolador"
    ],
    "notes": "Isolador para glúteo. Ajustar apoio e executar sem impulso.",
    "equipmentList": [],
    "technicalNotes": "Isolador para glúteo. Ajustar apoio e executar sem impulso."
  },
  {
    "name": "Cadeira Abdutora",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Glúteo máximo"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "abdução"
    ],
    "notes": "Isolador para glúteo médio. Controlar abertura e retorno, sem tirar quadril do banco.",
    "equipmentList": [],
    "technicalNotes": "Isolador para glúteo médio. Controlar abertura e retorno, sem tirar quadril do banco."
  },
  {
    "name": "Good Morning",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Glúteos",
      "Lombar"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "hinge"
    ],
    "notes": "Dobradiça de quadril avançada. Usar carga leve a moderada e manter coluna neutra.",
    "equipmentList": [],
    "technicalNotes": "Dobradiça de quadril avançada. Usar carga leve a moderada e manter coluna neutra."
  },
  {
    "name": "Panturrilha em Pé Máquina",
    "category": "Panturrilhas",
    "primaryGroup": "Gastrocnêmio",
    "secondaryGroups": [
      "Sóleo"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "flexão plantar"
    ],
    "notes": "Panturrilha com joelhos estendidos. Fazer pausa no topo e alongar com controle.",
    "equipmentList": [],
    "technicalNotes": "Panturrilha com joelhos estendidos. Fazer pausa no topo e alongar com controle."
  },
  {
    "name": "Panturrilha Sentado",
    "category": "Panturrilhas",
    "primaryGroup": "Sóleo",
    "secondaryGroups": [
      "Gastrocnêmio"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "flexão plantar"
    ],
    "notes": "Variação sentada com maior ênfase no sóleo. Evitar repetições curtas demais.",
    "equipmentList": [],
    "technicalNotes": "Variação sentada com maior ênfase no sóleo. Evitar repetições curtas demais."
  },
  {
    "name": "Panturrilha no Leg Press",
    "category": "Panturrilhas",
    "primaryGroup": "Gastrocnêmio",
    "secondaryGroups": [
      "Sóleo"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "flexão plantar"
    ],
    "notes": "Flexão plantar no leg press. Não deixar os pés escorregarem e controlar amplitude.",
    "equipmentList": [],
    "technicalNotes": "Flexão plantar no leg press. Não deixar os pés escorregarem e controlar amplitude."
  },
  {
    "name": "Panturrilha no Hack",
    "category": "Panturrilhas",
    "primaryGroup": "Gastrocnêmio",
    "secondaryGroups": [
      "Sóleo"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador",
      "flexão plantar"
    ],
    "notes": "Variação em hack para panturrilhas. Manter joelhos estáveis e movimento completo.",
    "equipmentList": [],
    "technicalNotes": "Variação em hack para panturrilhas. Manter joelhos estáveis e movimento completo."
  },
  {
    "name": "Panturrilha Unilateral em Pé",
    "category": "Panturrilhas",
    "primaryGroup": "Gastrocnêmio",
    "secondaryGroups": [
      "Sóleo",
      "Core"
    ],
    "tags": [
      "halteres",
      "livre",
      "unilateral",
      "isolador",
      "flexão plantar"
    ],
    "notes": "Panturrilha unilateral para equilíbrio de lados. Usar apoio e amplitude completa.",
    "equipmentList": [],
    "technicalNotes": "Panturrilha unilateral para equilíbrio de lados. Usar apoio e amplitude completa."
  },
  {
    "name": "Desenvolvimento com Barra",
    "category": "Ombros",
    "primaryGroup": "Deltoide anterior",
    "secondaryGroups": [
      "Deltoide medial",
      "Tríceps"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press vertical para ombros. Manter tronco firme e evitar compensar com lombar.",
    "equipmentList": [],
    "technicalNotes": "Press vertical para ombros. Manter tronco firme e evitar compensar com lombar."
  },
  {
    "name": "Desenvolvimento com Halteres",
    "category": "Ombros",
    "primaryGroup": "Deltoide anterior",
    "secondaryGroups": [
      "Deltoide medial",
      "Tríceps"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press vertical com halteres. Exige estabilidade e controle da trajetória.",
    "equipmentList": [],
    "technicalNotes": "Press vertical com halteres. Exige estabilidade e controle da trajetória."
  },
  {
    "name": "Desenvolvimento Máquina",
    "category": "Ombros",
    "primaryGroup": "Deltoide anterior",
    "secondaryGroups": [
      "Deltoide medial",
      "Tríceps"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press guiado para ombros. Ajustar altura do banco e evitar elevar os ombros.",
    "equipmentList": [],
    "technicalNotes": "Press guiado para ombros. Ajustar altura do banco e evitar elevar os ombros."
  },
  {
    "name": "Arnold Press",
    "category": "Ombros",
    "primaryGroup": "Deltoide anterior",
    "secondaryGroups": [
      "Deltoide medial",
      "Tríceps"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Variação com rotação. Usar carga moderada e movimento controlado.",
    "equipmentList": [],
    "technicalNotes": "Variação com rotação. Usar carga moderada e movimento controlado."
  },
  {
    "name": "Elevação Lateral com Halteres",
    "category": "Ombros",
    "primaryGroup": "Deltoide medial",
    "secondaryGroups": [
      "Trapézio superior"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "isolador",
      "abdução"
    ],
    "notes": "Isolador para deltoide medial. Subir até altura confortável sem encolher os ombros.",
    "equipmentList": [],
    "technicalNotes": "Isolador para deltoide medial. Subir até altura confortável sem encolher os ombros."
  },
  {
    "name": "Elevação Lateral no Cabo",
    "category": "Ombros",
    "primaryGroup": "Deltoide medial",
    "secondaryGroups": [
      "Trapézio superior"
    ],
    "tags": [
      "cabo",
      "polia",
      "unilateral",
      "isolador",
      "abdução"
    ],
    "notes": "Elevação lateral com tensão contínua. Manter controle e punho neutro.",
    "equipmentList": [],
    "technicalNotes": "Elevação lateral com tensão contínua. Manter controle e punho neutro."
  },
  {
    "name": "Elevação Frontal com Halteres",
    "category": "Ombros",
    "primaryGroup": "Deltoide anterior",
    "secondaryGroups": [
      "Peitoral superior"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "isolador",
      "flexão de ombro"
    ],
    "notes": "Isolador para deltoide anterior. Evitar balanço e excesso de carga.",
    "equipmentList": [],
    "technicalNotes": "Isolador para deltoide anterior. Evitar balanço e excesso de carga."
  },
  {
    "name": "Crucifixo Inverso com Halteres",
    "category": "Ombros",
    "primaryGroup": "Deltoide posterior",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Isolador para deltoide posterior. Manter tronco estável e cotovelos levemente flexionados.",
    "equipmentList": [],
    "technicalNotes": "Isolador para deltoide posterior. Manter tronco estável e cotovelos levemente flexionados."
  },
  {
    "name": "Peck Deck Inverso",
    "category": "Ombros",
    "primaryGroup": "Deltoide posterior",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador"
    ],
    "notes": "Máquina para deltoide posterior. Ajustar banco e puxar abrindo os braços sem impulso.",
    "equipmentList": [],
    "technicalNotes": "Máquina para deltoide posterior. Ajustar banco e puxar abrindo os braços sem impulso."
  },
  {
    "name": "Face Pull",
    "category": "Ombros",
    "primaryGroup": "Deltoide posterior",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio",
      "Manguito rotador"
    ],
    "tags": [
      "cabo",
      "corda",
      "bilateral",
      "isolador",
      "saúde do ombro"
    ],
    "notes": "Puxada para face com foco em deltoide posterior e estabilidade escapular. Cotovelos altos e controle.",
    "equipmentList": [],
    "technicalNotes": "Puxada para face com foco em deltoide posterior e estabilidade escapular. Cotovelos altos e controle."
  },
  {
    "name": "Remada Alta",
    "category": "Ombros",
    "primaryGroup": "Deltoide medial",
    "secondaryGroups": [
      "Trapézio superior",
      "Bíceps"
    ],
    "tags": [
      "barra",
      "cabo",
      "bilateral",
      "composto",
      "puxar"
    ],
    "notes": "Puxada vertical para ombros e trapézio. Usar amplitude confortável para não irritar ombros.",
    "equipmentList": [],
    "technicalNotes": "Puxada vertical para ombros e trapézio. Usar amplitude confortável para não irritar ombros."
  },
  {
    "name": "Rotação Externa no Cabo",
    "category": "Ombros",
    "primaryGroup": "Manguito rotador",
    "secondaryGroups": [
      "Deltoide posterior"
    ],
    "tags": [
      "cabo",
      "polia",
      "unilateral",
      "isolador",
      "saúde do ombro"
    ],
    "notes": "Exercício de rotação externa. Carga leve, cotovelo estável e execução lenta.",
    "equipmentList": [],
    "technicalNotes": "Exercício de rotação externa. Carga leve, cotovelo estável e execução lenta."
  },
  {
    "name": "Rotação Externa com Elástico",
    "category": "Ombros",
    "primaryGroup": "Manguito rotador",
    "secondaryGroups": [
      "Deltoide posterior"
    ],
    "tags": [
      "elástico",
      "livre",
      "unilateral",
      "isolador",
      "saúde do ombro"
    ],
    "notes": "Variação com elástico para manguito. Útil em aquecimento e controle de ombro.",
    "equipmentList": [],
    "technicalNotes": "Variação com elástico para manguito. Útil em aquecimento e controle de ombro."
  },
  {
    "name": "Rosca Direta com Barra",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial",
      "Antebraço"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "isolador",
      "flexão de cotovelo"
    ],
    "notes": "Rosca base para bíceps. Manter cotovelos próximos ao corpo e evitar balanço.",
    "equipmentList": [],
    "technicalNotes": "Rosca base para bíceps. Manter cotovelos próximos ao corpo e evitar balanço."
  },
  {
    "name": "Rosca Direta com Barra W",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial",
      "Antebraço"
    ],
    "tags": [
      "barra w",
      "livre",
      "bilateral",
      "isolador",
      "flexão de cotovelo"
    ],
    "notes": "Variação com barra W, geralmente mais confortável para punhos. Controlar a descida.",
    "equipmentList": [],
    "technicalNotes": "Variação com barra W, geralmente mais confortável para punhos. Controlar a descida."
  },
  {
    "name": "Rosca Alternada com Halteres",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial",
      "Antebraço"
    ],
    "tags": [
      "halteres",
      "livre",
      "unilateral",
      "isolador",
      "flexão de cotovelo"
    ],
    "notes": "Rosca alternada para controle de lados. Supinar o punho sem girar o tronco.",
    "equipmentList": [],
    "technicalNotes": "Rosca alternada para controle de lados. Supinar o punho sem girar o tronco."
  },
  {
    "name": "Rosca Concentrada",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial"
    ],
    "tags": [
      "halteres",
      "livre",
      "unilateral",
      "isolador"
    ],
    "notes": "Isolador unilateral. Executar devagar e evitar roubar com o ombro.",
    "equipmentList": [],
    "technicalNotes": "Isolador unilateral. Executar devagar e evitar roubar com o ombro."
  },
  {
    "name": "Rosca Martelo com Halteres",
    "category": "Bíceps",
    "primaryGroup": "Braquial",
    "secondaryGroups": [
      "Bíceps braquial",
      "Braquiorradial"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "isolador",
      "pegada neutra"
    ],
    "notes": "Rosca com pegada neutra para braquial e antebraço. Cotovelos estáveis.",
    "equipmentList": [],
    "technicalNotes": "Rosca com pegada neutra para braquial e antebraço. Cotovelos estáveis."
  },
  {
    "name": "Rosca Martelo na Corda",
    "category": "Bíceps",
    "primaryGroup": "Braquial",
    "secondaryGroups": [
      "Bíceps braquial",
      "Braquiorradial"
    ],
    "tags": [
      "cabo",
      "corda",
      "bilateral",
      "isolador",
      "pegada neutra"
    ],
    "notes": "Variação no cabo com tensão contínua. Manter ombros parados.",
    "equipmentList": [],
    "technicalNotes": "Variação no cabo com tensão contínua. Manter ombros parados."
  },
  {
    "name": "Rosca Scott Máquina",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador"
    ],
    "notes": "Rosca apoiada para reduzir balanço. Ajustar banco para cotovelos bem posicionados.",
    "equipmentList": [],
    "technicalNotes": "Rosca apoiada para reduzir balanço. Ajustar banco para cotovelos bem posicionados."
  },
  {
    "name": "Rosca Spider",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial"
    ],
    "tags": [
      "halteres",
      "banco inclinado",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Rosca com tronco apoiado. Reduz impulso e aumenta controle do bíceps.",
    "equipmentList": [],
    "technicalNotes": "Rosca com tronco apoiado. Reduz impulso e aumenta controle do bíceps."
  },
  {
    "name": "Rosca Inversa com Barra",
    "category": "Bíceps",
    "primaryGroup": "Braquiorradial",
    "secondaryGroups": [
      "Bíceps braquial",
      "Extensores do antebraço"
    ],
    "tags": [
      "barra",
      "livre",
      "bilateral",
      "isolador",
      "pegada pronada"
    ],
    "notes": "Rosca com pegada pronada para antebraço e braquial. Usar carga moderada.",
    "equipmentList": [],
    "technicalNotes": "Rosca com pegada pronada para antebraço e braquial. Usar carga moderada."
  },
  {
    "name": "Tríceps Corda no Cabo",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Ancôneo"
    ],
    "tags": [
      "cabo",
      "corda",
      "bilateral",
      "isolador",
      "extensão de cotovelo"
    ],
    "notes": "Extensão no cabo com corda. Abrir a corda no final e manter cotovelos fixos.",
    "equipmentList": [],
    "technicalNotes": "Extensão no cabo com corda. Abrir a corda no final e manter cotovelos fixos."
  },
  {
    "name": "Tríceps Barra no Cabo",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Ancôneo"
    ],
    "tags": [
      "cabo",
      "barra reta",
      "bilateral",
      "isolador",
      "extensão de cotovelo"
    ],
    "notes": "Extensão no cabo com barra. Evitar inclinar demais o tronco e controlar a volta.",
    "equipmentList": [],
    "technicalNotes": "Extensão no cabo com barra. Evitar inclinar demais o tronco e controlar a volta."
  },
  {
    "name": "Tríceps Testa com Barra W",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Ancôneo"
    ],
    "tags": [
      "barra w",
      "banco",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Extensão de cotovelos deitado. Cotovelos apontados para cima e movimento controlado.",
    "equipmentList": [],
    "technicalNotes": "Extensão de cotovelos deitado. Cotovelos apontados para cima e movimento controlado."
  },
  {
    "name": "Tríceps Francês com Halter",
    "category": "Tríceps",
    "primaryGroup": "Tríceps cabeça longa",
    "secondaryGroups": [
      "Tríceps braquial"
    ],
    "tags": [
      "halteres",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Extensão acima da cabeça com foco na cabeça longa. Evitar abrir os cotovelos.",
    "equipmentList": [],
    "technicalNotes": "Extensão acima da cabeça com foco na cabeça longa. Evitar abrir os cotovelos."
  },
  {
    "name": "Tríceps Francês na Corda",
    "category": "Tríceps",
    "primaryGroup": "Tríceps cabeça longa",
    "secondaryGroups": [
      "Tríceps braquial"
    ],
    "tags": [
      "cabo",
      "corda",
      "bilateral",
      "isolador"
    ],
    "notes": "Extensão acima da cabeça no cabo. Manter cotovelos estáveis e alongar com controle.",
    "equipmentList": [],
    "technicalNotes": "Extensão acima da cabeça no cabo. Manter cotovelos estáveis e alongar com controle."
  },
  {
    "name": "Tríceps Unilateral no Cabo",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Ancôneo"
    ],
    "tags": [
      "cabo",
      "polia",
      "unilateral",
      "isolador"
    ],
    "notes": "Extensão unilateral para corrigir assimetrias. Controle total, sem girar o tronco.",
    "equipmentList": [],
    "technicalNotes": "Extensão unilateral para corrigir assimetrias. Controle total, sem girar o tronco."
  },
  {
    "name": "Mergulho no Banco",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Peitoral maior",
      "Deltoide anterior"
    ],
    "tags": [
      "peso corporal",
      "banco",
      "livre",
      "bilateral",
      "composto"
    ],
    "notes": "Empurrar com peso corporal. Manter ombros confortáveis e amplitude segura.",
    "equipmentList": [],
    "technicalNotes": "Empurrar com peso corporal. Manter ombros confortáveis e amplitude segura."
  },
  {
    "name": "Paralelas",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Peitoral inferior",
      "Deltoide anterior"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Movimento avançado em barras paralelas. Controlar amplitude e estabilidade dos ombros.",
    "equipmentList": [],
    "technicalNotes": "Movimento avançado em barras paralelas. Controlar amplitude e estabilidade dos ombros."
  },
  {
    "name": "Coice Tríceps com Halter",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Deltoide posterior"
    ],
    "tags": [
      "halteres",
      "livre",
      "unilateral",
      "isolador"
    ],
    "notes": "Extensão de cotovelo inclinada. Manter braço parado e controlar a carga.",
    "equipmentList": [],
    "technicalNotes": "Extensão de cotovelo inclinada. Manter braço parado e controlar a carga."
  },
  {
    "name": "Supino Fechado",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Peitoral maior",
      "Deltoide anterior"
    ],
    "tags": [
      "barra",
      "banco",
      "livre",
      "bilateral",
      "composto",
      "empurrar"
    ],
    "notes": "Press com pegada fechada para tríceps. Evitar pegada estreita demais e manter punhos alinhados.",
    "equipmentList": [],
    "technicalNotes": "Press com pegada fechada para tríceps. Evitar pegada estreita demais e manter punhos alinhados."
  },
  {
    "name": "Abdominal Supra",
    "category": "Abdômen",
    "primaryGroup": "Reto abdominal",
    "secondaryGroups": [],
    "tags": [
      "peso corporal",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Flexão de tronco para reto abdominal. Evitar puxar o pescoço e controlar a descida.",
    "equipmentList": [],
    "technicalNotes": "Flexão de tronco para reto abdominal. Evitar puxar o pescoço e controlar a descida."
  },
  {
    "name": "Prancha Frontal",
    "category": "Abdômen",
    "primaryGroup": "Core",
    "secondaryGroups": [
      "Reto abdominal",
      "Transverso abdominal",
      "Glúteos"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "bilateral",
      "isométrico"
    ],
    "notes": "Isometria para core. Manter corpo alinhado, costelas baixas e glúteos ativos.",
    "equipmentList": [],
    "technicalNotes": "Isometria para core. Manter corpo alinhado, costelas baixas e glúteos ativos."
  },
  {
    "name": "Prancha Lateral",
    "category": "Abdômen",
    "primaryGroup": "Oblíquos",
    "secondaryGroups": [
      "Core",
      "Glúteo médio"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "unilateral",
      "isométrico"
    ],
    "notes": "Isometria lateral para oblíquos. Manter quadril elevado e alinhado.",
    "equipmentList": [],
    "technicalNotes": "Isometria lateral para oblíquos. Manter quadril elevado e alinhado."
  },
  {
    "name": "Elevação de Pernas",
    "category": "Abdômen",
    "primaryGroup": "Reto abdominal inferior",
    "secondaryGroups": [
      "Flexores do quadril"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Elevação de pernas para abdômen inferior. Controlar lombar e evitar balanço.",
    "equipmentList": [],
    "technicalNotes": "Elevação de pernas para abdômen inferior. Controlar lombar e evitar balanço."
  },
  {
    "name": "Abdominal Infra no Banco",
    "category": "Abdômen",
    "primaryGroup": "Reto abdominal inferior",
    "secondaryGroups": [
      "Flexores do quadril"
    ],
    "tags": [
      "banco",
      "peso corporal",
      "livre",
      "bilateral",
      "isolador"
    ],
    "notes": "Variação em banco para região inferior. Fazer retroversão pélvica no final.",
    "equipmentList": [],
    "technicalNotes": "Variação em banco para região inferior. Fazer retroversão pélvica no final."
  },
  {
    "name": "Abdominal na Polia",
    "category": "Abdômen",
    "primaryGroup": "Reto abdominal",
    "secondaryGroups": [
      "Oblíquos"
    ],
    "tags": [
      "cabo",
      "corda",
      "bilateral",
      "isolador"
    ],
    "notes": "Crunch ajoelhado no cabo. Flexionar a coluna com controle, sem puxar apenas com os braços.",
    "equipmentList": [],
    "technicalNotes": "Crunch ajoelhado no cabo. Flexionar a coluna com controle, sem puxar apenas com os braços."
  },
  {
    "name": "Crunch Máquina",
    "category": "Abdômen",
    "primaryGroup": "Reto abdominal",
    "secondaryGroups": [
      "Oblíquos"
    ],
    "tags": [
      "máquina",
      "bilateral",
      "isolador"
    ],
    "notes": "Abdominal guiado. Ajustar carga e amplitude para manter contração do abdômen.",
    "equipmentList": [],
    "technicalNotes": "Abdominal guiado. Ajustar carga e amplitude para manter contração do abdômen."
  },
  {
    "name": "Abdominal Bicicleta",
    "category": "Abdômen",
    "primaryGroup": "Oblíquos",
    "secondaryGroups": [
      "Reto abdominal",
      "Flexores do quadril"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "bilateral",
      "dinâmico"
    ],
    "notes": "Movimento alternado para oblíquos. Controlar rotação sem puxar o pescoço.",
    "equipmentList": [],
    "technicalNotes": "Movimento alternado para oblíquos. Controlar rotação sem puxar o pescoço."
  },
  {
    "name": "Dead Bug",
    "category": "Abdômen",
    "primaryGroup": "Core",
    "secondaryGroups": [
      "Transverso abdominal",
      "Flexores do quadril"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "bilateral",
      "controle motor"
    ],
    "notes": "Exercício de controle do core. Manter lombar estável enquanto alterna braços e pernas.",
    "equipmentList": [],
    "technicalNotes": "Exercício de controle do core. Manter lombar estável enquanto alterna braços e pernas."
  },
  {
    "name": "Pallof Press",
    "category": "Abdômen",
    "primaryGroup": "Core anti-rotação",
    "secondaryGroups": [
      "Oblíquos",
      "Glúteos"
    ],
    "tags": [
      "cabo",
      "elástico",
      "unilateral",
      "anti-rotação"
    ],
    "notes": "Press anti-rotação para estabilidade do core. Resistir à rotação do tronco.",
    "equipmentList": [],
    "technicalNotes": "Press anti-rotação para estabilidade do core. Resistir à rotação do tronco."
  },
  {
    "name": "Esteira",
    "category": "Cardio",
    "primaryGroup": "Condicionamento cardiovascular",
    "secondaryGroups": [
      "Pernas"
    ],
    "tags": [
      "máquina",
      "cardio",
      "aeróbico"
    ],
    "notes": "Cardio em caminhada ou corrida. Ajustar velocidade e inclinação conforme objetivo e condição do aluno.",
    "equipmentList": [],
    "technicalNotes": "Cardio em caminhada ou corrida. Ajustar velocidade e inclinação conforme objetivo e condição do aluno."
  },
  {
    "name": "Bicicleta Ergométrica",
    "category": "Cardio",
    "primaryGroup": "Condicionamento cardiovascular",
    "secondaryGroups": [
      "Quadríceps",
      "Glúteos"
    ],
    "tags": [
      "máquina",
      "cardio",
      "aeróbico",
      "baixo impacto"
    ],
    "notes": "Cardio de baixo impacto. Ajustar banco e carga para manter cadência confortável.",
    "equipmentList": [],
    "technicalNotes": "Cardio de baixo impacto. Ajustar banco e carga para manter cadência confortável."
  },
  {
    "name": "Elíptico",
    "category": "Cardio",
    "primaryGroup": "Condicionamento cardiovascular",
    "secondaryGroups": [
      "Pernas",
      "Glúteos"
    ],
    "tags": [
      "máquina",
      "cardio",
      "aeróbico",
      "baixo impacto"
    ],
    "notes": "Cardio com baixo impacto articular. Manter postura ereta e ritmo constante.",
    "equipmentList": [],
    "technicalNotes": "Cardio com baixo impacto articular. Manter postura ereta e ritmo constante."
  },
  {
    "name": "Remo Indoor",
    "category": "Cardio",
    "primaryGroup": "Condicionamento cardiovascular",
    "secondaryGroups": [
      "Costas",
      "Pernas",
      "Core"
    ],
    "tags": [
      "máquina",
      "cardio",
      "aeróbico",
      "puxar"
    ],
    "notes": "Cardio com participação de pernas e costas. Coordenar pernas, tronco e braços.",
    "equipmentList": [],
    "technicalNotes": "Cardio com participação de pernas e costas. Coordenar pernas, tronco e braços."
  },
  {
    "name": "Escada / Stair Climber",
    "category": "Cardio",
    "primaryGroup": "Condicionamento cardiovascular",
    "secondaryGroups": [
      "Glúteos",
      "Quadríceps",
      "Panturrilhas"
    ],
    "tags": [
      "máquina",
      "cardio",
      "aeróbico"
    ],
    "notes": "Cardio com ênfase em pernas e glúteos. Evitar apoiar excesso de peso nos braços.",
    "equipmentList": [],
    "technicalNotes": "Cardio com ênfase em pernas e glúteos. Evitar apoiar excesso de peso nos braços."
  },
  {
    "name": "Mobilidade de Quadril",
    "category": "Mobilidade",
    "primaryGroup": "Quadril",
    "secondaryGroups": [
      "Glúteos",
      "Adutores",
      "Flexores do quadril"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "mobilidade",
      "aquecimento"
    ],
    "notes": "Sequência para melhorar amplitude do quadril. Executar devagar, sem dor.",
    "equipmentList": [],
    "technicalNotes": "Sequência para melhorar amplitude do quadril. Executar devagar, sem dor."
  },
  {
    "name": "Mobilidade Torácica",
    "category": "Mobilidade",
    "primaryGroup": "Coluna torácica",
    "secondaryGroups": [
      "Ombros",
      "Costas"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "mobilidade",
      "aquecimento"
    ],
    "notes": "Mobilidade para coluna torácica. Útil antes de treino de membros superiores e agachamentos.",
    "equipmentList": [],
    "technicalNotes": "Mobilidade para coluna torácica. Útil antes de treino de membros superiores e agachamentos."
  },
  {
    "name": "Alongamento de Posterior",
    "category": "Mobilidade",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Panturrilhas",
      "Lombar"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "alongamento",
      "mobilidade"
    ],
    "notes": "Alongamento para cadeia posterior. Manter respiração e evitar forçar dor aguda.",
    "equipmentList": [],
    "technicalNotes": "Alongamento para cadeia posterior. Manter respiração e evitar forçar dor aguda."
  },
  {
    "name": "Alongamento de Peitoral",
    "category": "Mobilidade",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "tags": [
      "peso corporal",
      "livre",
      "alongamento",
      "mobilidade"
    ],
    "notes": "Alongamento para peitoral e ombros. Útil para postura e preparação de membros superiores.",
    "equipmentList": [],
    "technicalNotes": "Alongamento para peitoral e ombros. Útil para postura e preparação de membros superiores."
  },
  {
    "name": "Ativação com Mini Band",
    "category": "Mobilidade",
    "primaryGroup": "Glúteo médio",
    "secondaryGroups": [
      "Glúteo máximo",
      "Quadril"
    ],
    "tags": [
      "mini band",
      "elástico",
      "aquecimento",
      "ativação"
    ],
    "notes": "Ativação de glúteos antes de membros inferiores. Manter tensão contínua na faixa.",
    "equipmentList": [],
    "technicalNotes": "Ativação de glúteos antes de membros inferiores. Manter tensão contínua na faixa."
  },
  {
    "name": "Supino Declinado com Halteres",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "halteres",
      "banco declinado"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "livre"
    ],
    "technicalNotes": "Mantenha escápulas retraídas e controle os halteres sem perder estabilidade no banco declinado.",
    "notes": ""
  },
  {
    "name": "Supino Declinado no Smith",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "smith",
      "banco declinado"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "guiado"
    ],
    "technicalNotes": "Ajuste o banco para que a barra desça com conforto na linha inferior do peitoral.",
    "notes": ""
  },
  {
    "name": "Supino Declinado Máquina",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "guiado"
    ],
    "technicalNotes": "Regule o assento para alinhar as manoplas ao peitoral inferior e evite travar os cotovelos.",
    "notes": ""
  },
  {
    "name": "Supino Declinado Convergente Máquina",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "convergente"
    ],
    "technicalNotes": "Controle a fase excêntrica e aproxime as manoplas sem perder contato das costas no apoio.",
    "notes": ""
  },
  {
    "name": "Crucifixo Declinado com Halteres",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "equipmentList": [
      "halteres",
      "banco declinado"
    ],
    "tags": [
      "bilateral",
      "isolador",
      "livre"
    ],
    "technicalNotes": "Use cotovelos levemente flexionados e amplitude confortável para proteger os ombros.",
    "notes": ""
  },
  {
    "name": "Mergulho nas Paralelas com Foco em Peitoral",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "paralelas",
      "peso corporal"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar"
    ],
    "technicalNotes": "Incline o tronco levemente à frente e desça apenas até manter controle dos ombros.",
    "notes": ""
  },
  {
    "name": "Flexão Declinada",
    "category": "Peito",
    "primaryGroup": "Peitoral superior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior",
      "Core"
    ],
    "equipmentList": [
      "peso corporal",
      "banco"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "livre"
    ],
    "technicalNotes": "Pés elevados aumentam a ênfase no peitoral superior; mantenha o corpo alinhado.",
    "notes": ""
  },
  {
    "name": "Supino Inclinado Máquina",
    "category": "Peito",
    "primaryGroup": "Peitoral superior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "guiado"
    ],
    "technicalNotes": "Regule o banco para empurrar na direção do peitoral superior sem elevar os ombros.",
    "notes": ""
  },
  {
    "name": "Supino Reto no Smith",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "smith",
      "banco"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "guiado"
    ],
    "technicalNotes": "Alinhe a barra ao meio do peitoral e mantenha punhos neutros durante o movimento.",
    "notes": ""
  },
  {
    "name": "Crucifixo no Cabo Médio",
    "category": "Peito",
    "primaryGroup": "Peitoral maior",
    "secondaryGroups": [
      "Deltoide anterior"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "bilateral",
      "isolador"
    ],
    "technicalNotes": "Mantenha tensão contínua e cruze levemente as mãos sem projetar os ombros à frente.",
    "notes": ""
  },
  {
    "name": "Flexão Inclinada",
    "category": "Peito",
    "primaryGroup": "Peitoral inferior",
    "secondaryGroups": [
      "Tríceps",
      "Deltoide anterior",
      "Core"
    ],
    "equipmentList": [
      "peso corporal",
      "banco"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "livre"
    ],
    "technicalNotes": "Mãos elevadas reduzem a dificuldade; mantenha tronco firme e cotovelos controlados.",
    "notes": ""
  },
  {
    "name": "Barra Fixa Neutra",
    "category": "Costas",
    "primaryGroup": "Latíssimo do dorso",
    "secondaryGroups": [
      "Bíceps",
      "Romboides",
      "Trapézio médio"
    ],
    "equipmentList": [
      "barra fixa"
    ],
    "tags": [
      "bilateral",
      "composto",
      "puxar",
      "peso corporal"
    ],
    "technicalNotes": "Puxe o peito em direção à barra mantendo escápulas deprimidas e sem balanço.",
    "notes": ""
  },
  {
    "name": "Puxada Alta Fechada Neutra",
    "category": "Costas",
    "primaryGroup": "Latíssimo do dorso",
    "secondaryGroups": [
      "Bíceps",
      "Romboides"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "bilateral",
      "composto",
      "puxar"
    ],
    "technicalNotes": "Use pegada neutra fechada e puxe os cotovelos para baixo sem jogar o tronco para trás.",
    "notes": ""
  },
  {
    "name": "Puxada Unilateral no Cabo",
    "category": "Costas",
    "primaryGroup": "Latíssimo do dorso",
    "secondaryGroups": [
      "Bíceps",
      "Romboides"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "unilateral",
      "composto",
      "puxar"
    ],
    "technicalNotes": "Estabilize o tronco e leve o cotovelo para baixo e para trás com controle.",
    "notes": ""
  },
  {
    "name": "Remada Unilateral no Cabo",
    "category": "Costas",
    "primaryGroup": "Latíssimo do dorso",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio",
      "Bíceps"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "unilateral",
      "composto",
      "puxar"
    ],
    "technicalNotes": "Evite girar o tronco e finalize a puxada aproximando a escápula da coluna.",
    "notes": ""
  },
  {
    "name": "Remada Apoiada no Banco Inclinado",
    "category": "Costas",
    "primaryGroup": "Romboides",
    "secondaryGroups": [
      "Latíssimo do dorso",
      "Trapézio médio",
      "Bíceps"
    ],
    "equipmentList": [
      "halteres",
      "banco inclinado"
    ],
    "tags": [
      "bilateral",
      "composto",
      "puxar",
      "livre"
    ],
    "technicalNotes": "Apoie o peito no banco e puxe os cotovelos para trás sem elevar os ombros.",
    "notes": ""
  },
  {
    "name": "Pullover Máquina",
    "category": "Costas",
    "primaryGroup": "Latíssimo do dorso",
    "secondaryGroups": [
      "Peitoral maior",
      "Serrátil"
    ],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "bilateral",
      "isolador",
      "puxar",
      "guiado"
    ],
    "technicalNotes": "Mantenha costelas baixas e faça a puxada com os dorsais, sem flexionar demais os cotovelos.",
    "notes": ""
  },
  {
    "name": "Agachamento Goblet",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa",
      "Core"
    ],
    "equipmentList": [
      "halter",
      "kettlebell"
    ],
    "tags": [
      "bilateral",
      "composto",
      "livre"
    ],
    "technicalNotes": "Segure a carga próxima ao peito e agache mantendo joelhos alinhados aos pés.",
    "notes": ""
  },
  {
    "name": "Agachamento Sumô",
    "category": "Pernas",
    "primaryGroup": "Adutores",
    "secondaryGroups": [
      "Glúteos",
      "Quadríceps",
      "Posterior de coxa"
    ],
    "equipmentList": [
      "barra",
      "halteres"
    ],
    "tags": [
      "bilateral",
      "composto",
      "livre"
    ],
    "technicalNotes": "Use base ampla, pés levemente abertos e mantenha a coluna neutra durante a descida.",
    "notes": ""
  },
  {
    "name": "Terra Sumô",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Glúteos",
      "Lombar",
      "Core"
    ],
    "equipmentList": [
      "barra"
    ],
    "tags": [
      "bilateral",
      "composto",
      "puxar",
      "livre"
    ],
    "technicalNotes": "Aproxime a barra do corpo, empurre o chão com os pés e preserve a lombar neutra.",
    "notes": ""
  },
  {
    "name": "Leg Press Unilateral",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [
      "Glúteos",
      "Posterior de coxa"
    ],
    "equipmentList": [
      "leg press"
    ],
    "tags": [
      "unilateral",
      "composto",
      "guiado"
    ],
    "technicalNotes": "Controle a amplitude sem tirar o quadril do apoio e mantenha joelho alinhado.",
    "notes": ""
  },
  {
    "name": "Cadeira Extensora Unilateral",
    "category": "Pernas",
    "primaryGroup": "Quadríceps",
    "secondaryGroups": [],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "unilateral",
      "isolador",
      "guiado"
    ],
    "technicalNotes": "Estenda o joelho com controle e evite impulsos no início do movimento.",
    "notes": ""
  },
  {
    "name": "Flexora Sentada Unilateral",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Panturrilhas"
    ],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "unilateral",
      "isolador",
      "guiado"
    ],
    "technicalNotes": "Mantenha o quadril apoiado e flexione o joelho sem perder contato com o encosto.",
    "notes": ""
  },
  {
    "name": "Nordic Hamstring",
    "category": "Pernas",
    "primaryGroup": "Posterior de coxa",
    "secondaryGroups": [
      "Glúteos",
      "Core"
    ],
    "equipmentList": [
      "peso corporal"
    ],
    "tags": [
      "bilateral",
      "excêntrico",
      "livre"
    ],
    "technicalNotes": "Desça lentamente controlando a fase excêntrica e use as mãos para proteger a queda.",
    "notes": ""
  },
  {
    "name": "Abdução no Cabo",
    "category": "Pernas",
    "primaryGroup": "Abdutores",
    "secondaryGroups": [
      "Glúteo máximo"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "unilateral",
      "isolador"
    ],
    "technicalNotes": "Mantenha pelve estável e conduza a perna lateralmente sem inclinar o tronco.",
    "notes": ""
  },
  {
    "name": "Glúteo 4 Apoios",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Posterior de coxa",
      "Core"
    ],
    "equipmentList": [
      "peso corporal",
      "caneleira"
    ],
    "tags": [
      "unilateral",
      "isolador"
    ],
    "technicalNotes": "Evite arquear a lombar e empurre o calcanhar para cima com controle.",
    "notes": ""
  },
  {
    "name": "Ponte de Glúteos",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Posterior de coxa",
      "Core"
    ],
    "equipmentList": [
      "peso corporal",
      "barra"
    ],
    "tags": [
      "bilateral",
      "composto",
      "livre"
    ],
    "technicalNotes": "Contraia glúteos no topo sem hiperestender a lombar.",
    "notes": ""
  },
  {
    "name": "Elevação Pélvica Unilateral",
    "category": "Pernas",
    "primaryGroup": "Glúteos",
    "secondaryGroups": [
      "Posterior de coxa",
      "Core"
    ],
    "equipmentList": [
      "peso corporal",
      "banco"
    ],
    "tags": [
      "unilateral",
      "composto",
      "livre"
    ],
    "technicalNotes": "Mantenha o quadril nivelado e suba empurrando pelo calcanhar da perna de apoio.",
    "notes": ""
  },
  {
    "name": "Adutor no Cabo",
    "category": "Pernas",
    "primaryGroup": "Adutores",
    "secondaryGroups": [
      "Core"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "unilateral",
      "isolador"
    ],
    "technicalNotes": "Cruze a perna à frente com controle e mantenha o tronco estável.",
    "notes": ""
  },
  {
    "name": "Elevação Lateral Máquina",
    "category": "Ombros",
    "primaryGroup": "Deltoide medial",
    "secondaryGroups": [
      "Trapézio"
    ],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "bilateral",
      "isolador",
      "guiado"
    ],
    "technicalNotes": "Regule o eixo da máquina ao ombro e eleve sem encolher excessivamente o trapézio.",
    "notes": ""
  },
  {
    "name": "Desenvolvimento no Smith",
    "category": "Ombros",
    "primaryGroup": "Deltoide anterior",
    "secondaryGroups": [
      "Deltoide medial",
      "Tríceps",
      "Trapézio"
    ],
    "equipmentList": [
      "smith",
      "banco"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "guiado"
    ],
    "technicalNotes": "Sente-se firme e conduza a barra em amplitude confortável para os ombros.",
    "notes": ""
  },
  {
    "name": "Crucifixo Inverso no Cabo",
    "category": "Ombros",
    "primaryGroup": "Deltoide posterior",
    "secondaryGroups": [
      "Romboides",
      "Trapézio médio"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "bilateral",
      "isolador",
      "puxar"
    ],
    "technicalNotes": "Cruze os cabos e abra os braços mantendo cotovelos levemente flexionados.",
    "notes": ""
  },
  {
    "name": "Elevação Lateral Inclinado",
    "category": "Ombros",
    "primaryGroup": "Deltoide medial",
    "secondaryGroups": [
      "Trapézio"
    ],
    "equipmentList": [
      "halteres",
      "banco inclinado"
    ],
    "tags": [
      "unilateral",
      "isolador",
      "livre"
    ],
    "technicalNotes": "Use o banco para reduzir impulso e eleve o halter em linha lateral ao corpo.",
    "notes": ""
  },
  {
    "name": "Y-Raise Inclinado",
    "category": "Ombros",
    "primaryGroup": "Deltoide posterior",
    "secondaryGroups": [
      "Trapézio inferior",
      "Manguito rotador"
    ],
    "equipmentList": [
      "halteres",
      "banco inclinado"
    ],
    "tags": [
      "bilateral",
      "isolador",
      "livre"
    ],
    "technicalNotes": "Eleve os braços em formato de Y com carga leve e controle escapular.",
    "notes": ""
  },
  {
    "name": "Rosca Inclinado com Halteres",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial",
      "Braquiorradial"
    ],
    "equipmentList": [
      "halteres",
      "banco inclinado"
    ],
    "tags": [
      "bilateral",
      "isolador",
      "livre"
    ],
    "technicalNotes": "Mantenha os braços atrás do tronco e flexione os cotovelos sem balançar.",
    "notes": ""
  },
  {
    "name": "Rosca no Cabo",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "bilateral",
      "isolador"
    ],
    "technicalNotes": "Mantenha tensão contínua e cotovelos fixos ao lado do corpo.",
    "notes": ""
  },
  {
    "name": "Rosca Scott com Barra W",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial"
    ],
    "equipmentList": [
      "barra w",
      "banco scott"
    ],
    "tags": [
      "bilateral",
      "isolador",
      "livre"
    ],
    "technicalNotes": "Apoie os braços no banco e não relaxe totalmente os cotovelos no fim da descida.",
    "notes": ""
  },
  {
    "name": "Rosca Bayesian no Cabo",
    "category": "Bíceps",
    "primaryGroup": "Bíceps braquial",
    "secondaryGroups": [
      "Braquial"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "unilateral",
      "isolador"
    ],
    "technicalNotes": "Fique à frente da polia baixa e flexione o cotovelo mantendo o braço atrás do tronco.",
    "notes": ""
  },
  {
    "name": "Tríceps Testa no Cabo",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Ancôneo"
    ],
    "equipmentList": [
      "cabo",
      "polia"
    ],
    "tags": [
      "bilateral",
      "isolador"
    ],
    "technicalNotes": "Mantenha cotovelos apontados para cima e estenda sem abrir demais os braços.",
    "notes": ""
  },
  {
    "name": "Tríceps Mergulho Máquina",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Peitoral inferior",
      "Deltoide anterior"
    ],
    "equipmentList": [
      "máquina"
    ],
    "tags": [
      "bilateral",
      "composto",
      "empurrar",
      "guiado"
    ],
    "technicalNotes": "Ajuste o assento e empurre as alças para baixo mantendo ombros estáveis.",
    "notes": ""
  },
  {
    "name": "Tríceps Francês Unilateral com Halter",
    "category": "Tríceps",
    "primaryGroup": "Tríceps braquial",
    "secondaryGroups": [
      "Core"
    ],
    "equipmentList": [
      "halter"
    ],
    "tags": [
      "unilateral",
      "isolador",
      "livre"
    ],
    "technicalNotes": "Controle o halter atrás da cabeça e mantenha o cotovelo estável.",
    "notes": ""
  },
  {
    "name": "Roda Abdominal",
    "category": "Abdômen",
    "primaryGroup": "Reto abdominal",
    "secondaryGroups": [
      "Core",
      "Serrátil",
      "Dorsais"
    ],
    "equipmentList": [
      "roda"
    ],
    "tags": [
      "bilateral",
      "core",
      "livre"
    ],
    "technicalNotes": "Avance apenas até manter a lombar neutra e retorne contraindo o abdômen.",
    "notes": ""
  },
  {
    "name": "Elevação de Joelhos na Barra",
    "category": "Abdômen",
    "primaryGroup": "Reto abdominal",
    "secondaryGroups": [
      "Flexores do quadril",
      "Core"
    ],
    "equipmentList": [
      "barra fixa"
    ],
    "tags": [
      "bilateral",
      "core",
      "peso corporal"
    ],
    "technicalNotes": "Evite balanço e eleve os joelhos com controle da pelve.",
    "notes": ""
  },
  {
    "name": "Russian Twist",
    "category": "Abdômen",
    "primaryGroup": "Oblíquos",
    "secondaryGroups": [
      "Reto abdominal",
      "Core"
    ],
    "equipmentList": [
      "peso corporal",
      "anilha",
      "halter"
    ],
    "tags": [
      "bilateral",
      "core",
      "rotação"
    ],
    "technicalNotes": "Gire o tronco com controle e mantenha coluna longa, sem puxar pelo pescoço.",
    "notes": ""
  },
  {
    "name": "Prancha com Carga",
    "category": "Abdômen",
    "primaryGroup": "Core",
    "secondaryGroups": [
      "Reto abdominal",
      "Oblíquos",
      "Glúteos"
    ],
    "equipmentList": [
      "anilha",
      "peso corporal"
    ],
    "tags": [
      "bilateral",
      "isométrico",
      "core"
    ],
    "technicalNotes": "Mantenha alinhamento da cabeça aos pés e carga posicionada com segurança.",
    "notes": ""
  },
  {
    "name": "Bike Spinning",
    "category": "Cardio",
    "primaryGroup": "Sistema cardiovascular",
    "secondaryGroups": [
      "Quadríceps",
      "Glúteos",
      "Panturrilhas"
    ],
    "equipmentList": [
      "bike"
    ],
    "tags": [
      "cardio",
      "baixo impacto"
    ],
    "technicalNotes": "Ajuste selim e guidão antes do início e mantenha cadência compatível com o objetivo.",
    "notes": ""
  },
  {
    "name": "Air Bike",
    "category": "Cardio",
    "primaryGroup": "Sistema cardiovascular",
    "secondaryGroups": [
      "Quadríceps",
      "Glúteos",
      "Ombros",
      "Costas"
    ],
    "equipmentList": [
      "air bike"
    ],
    "tags": [
      "cardio",
      "corpo inteiro"
    ],
    "technicalNotes": "Use braços e pernas de forma coordenada e controle a intensidade por intervalos.",
    "notes": ""
  },
  {
    "name": "Mobilidade de Tornozelo",
    "category": "Mobilidade",
    "primaryGroup": "Tornozelo",
    "secondaryGroups": [
      "Panturrilhas",
      "Tibial anterior"
    ],
    "equipmentList": [
      "peso corporal"
    ],
    "tags": [
      "mobilidade",
      "aquecimento"
    ],
    "technicalNotes": "Avance o joelho sobre o pé mantendo o calcanhar apoiado e sem dor aguda.",
    "notes": ""
  }
];

function slugifyExerciseName(name){
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const EXERCISE_LIBRARY = [...EXERCISE_LIBRARY_RAW, ...EXERCISE_LIBRARY_VARIANTS].map(exercise => ({
  ...exercise,
  id: exercise.id || `seed-${slugifyExerciseName(exercise.name)}`,
  group: exercise.group || exercise.primaryGroup || exercise.category || "Outro",
  equipment: Array.isArray(exercise.equipmentList) ? exercise.equipmentList.join(", ") : Array.isArray(exercise.tags) ? exercise.tags.join(", ") : String(exercise.equipment || ""),
  equipmentList: Array.isArray(exercise.equipmentList) ? exercise.equipmentList : [],
  secondaryGroups: Array.isArray(exercise.secondaryGroups) ? exercise.secondaryGroups : [],
  tags: Array.isArray(exercise.tags) ? exercise.tags : [],
  notes: String(exercise.notes || ""),
  technicalNotes: String(exercise.technicalNotes || exercise.notes || "")
}));
