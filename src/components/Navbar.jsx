import { Link } from 'react-router-dom';

/**
 * 导航栏组件
 */
const Navbar = () => {
  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="container mx-auto">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl">
            商品价格预测模型验证工具
          </Link>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link to="/">首页</Link>
            </li>
            <li>
              <Link to="/single-prediction">单个预测</Link>
            </li>
            <li>
              <Link to="/batch-prediction">批量预测</Link>
            </li>
            <li>
              <a href="https://docs.cloudbase.net/" target="_blank" rel="noopener noreferrer">
                帮助文档
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;