import { useState } from 'react';
import SinglePredictionPage from './pages/SinglePredictionPage';
import BatchPredictionPage from './pages/BatchPredictionPage';

/**
 * 主应用组件
 */
function App() {
  const [currentPage, setCurrentPage] = useState('single');

  return (
    <div className="min-h-screen bg-base-200">
      {/* 导航栏 */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <a 
                  onClick={() => setCurrentPage('single')}
                  className={currentPage === 'single' ? 'active' : ''}
                >
                  单商品预测
                </a>
              </li>
              <li>
                <a 
                  onClick={() => setCurrentPage('batch')}
                  className={currentPage === 'batch' ? 'active' : ''}
                >
                  批量预测
                </a>
              </li>
            </ul>
          </div>
          <a className="btn btn-ghost text-xl">商品价格预测验证工具</a>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <a 
                onClick={() => setCurrentPage('single')}
                className={currentPage === 'single' ? 'active' : ''}
              >
                单商品预测
              </a>
            </li>
            <li>
              <a 
                onClick={() => setCurrentPage('batch')}
                className={currentPage === 'batch' ? 'active' : ''}
              >
                批量预测
              </a>
            </li>
          </ul>
        </div>
        <div className="navbar-end">
          <div className="badge badge-primary">MVP v1.0</div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'single' && <SinglePredictionPage />}
        {currentPage === 'batch' && <BatchPredictionPage />}
      </main>

      {/* 页脚 */}
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <aside>
          <p>商品价格预测模型验证工具 © 2025 - 第一阶段 MVP</p>
        </aside>
      </footer>
    </div>
  );
}

export default App;