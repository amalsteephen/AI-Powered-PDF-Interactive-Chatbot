import os
from typing import List
from dotenv import load_dotenv
import PyPDF2

from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain.tools import tool

from langchain.agents import initialize_agent, AgentType
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# Load and split PDF
def load_pdf_content(pdf_path: str) -> List[Document]:
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        full_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text += text

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    return splitter.create_documents([full_text])

# Create FAISS index
def create_vector_store(docs: List[Document]) -> FAISS:
    embeddings = OpenAIEmbeddings()
    return FAISS.from_documents(docs, embeddings)

# LangChain Agent for PDF
def get_pdf_agent(vectorstore: FAISS):
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})

    @tool
    def search_pdf(query: str) -> str:
        """Search for relevant content in the uploaded PDF."""
        docs = retriever.get_relevant_documents(query)
        return "\n\n".join([doc.page_content for doc in docs])

    tools = [search_pdf]
    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)

    return initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.OPENAI_FUNCTIONS,
        verbose=False
    )

# PDFChatHandler Class
class PDFChatHandler:
    def __init__(self, pdf_path: str):
        docs = load_pdf_content(pdf_path)
        self.vectorstore = create_vector_store(docs)
        self.agent = get_pdf_agent(self.vectorstore)

    def ask(self, query: str) -> str:
        return self.agent.run(query)

# Memory chatbot for general questions
general_llm = ChatOpenAI(model="gpt-4o", temperature=0)
general_memory = ConversationBufferMemory(return_messages=True)
general_chat_chain = ConversationChain(llm=general_llm, memory=general_memory, verbose=False)

def handle_general_question(question: str) -> str:
    return general_chat_chain.predict(input=question)


if __name__ == "__main__":
    print("Chat Mode (Type 'upload <path>' to load a PDF, or ask general questions directly)")
    print("Example: upload sample.pdf\n")

    current_handler = None  # type: Optional[PDFChatHandler]

    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() == "exit":
            print("Chat ended.")
            break
        elif user_input.lower().startswith("upload "):
            pdf_path = user_input[7:].strip()
            if not os.path.exists(pdf_path):
                print("File not found:", pdf_path)
                continue
            try:
                current_handler = PDFChatHandler(pdf_path)
                print(f"PDF '{os.path.basename(pdf_path)}' loaded. Ask questions related to it!")
            except Exception as e:
                print("Failed to load PDF:", str(e))
        else:
            try:
                if current_handler:
                    response = current_handler.ask(user_input)
                else:
                    response = handle_general_question(user_input)
                print("AI:", response)
            except Exception as e:
                print("Error:", e)
