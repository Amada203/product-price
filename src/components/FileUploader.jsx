import { useState, useRef } from 'react';

/**
 * 文件上传组件
 * @param {Object} props - 组件属性
 * @param {Function} props.onFileLoaded - 文件加载完成回调函数
 * @param {string} props.accept - 接受的文件类型
 * @param {boolean} props.multiple - 是否允许多文件上传
 * @param {string} props.label - 上传按钮文本
 */
const FileUploader = ({ 
  onFileLoaded, 
  accept = ".csv, .xlsx, .xls, text/plain", 
  multiple = false,
  label = "上传文件"
}) => {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * 处理文件选择
   * @param {Event} e - 事件对象
   */
  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const file = files[0];
      setFileName(file.name);

      // 根据文件类型处理
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        await handleCsvFile(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        await handleExcelFile(file);
      } else {
        throw new Error('不支持的文件格式');
      }
    } catch (err) {
      console.error('文件处理错误:', err);
      setError(err.message || '文件处理失败');
      setFileName('');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理CSV文件
   * @param {File} file - CSV文件对象
   */
  const handleCsvFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const lines = content.split(/\\r?\\n/).filter(line => line.trim());
          
          // 假设CSV文件的第一列是商品ID
          const skuIds = lines.map(line => {
            const columns = line.split(',');
            return columns[0].trim();
          }).filter(id => id && id !== 'sku_id' && id !== 'id'); // 过滤掉可能的表头和空值
          
          if (skuIds.length === 0) {
            reject(new Error('未找到有效的商品ID'));
            return;
          }
          
          onFileLoaded(skuIds);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsText(file);
    });
  };

  /**
   * 处理Excel文件
   * @param {File} file - Excel文件对象
   */
  const handleExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      // 由于Excel文件处理需要额外的库，这里简化处理
      // 在实际项目中，可以使用xlsx库来处理Excel文件
      reject(new Error('Excel文件处理功能尚未实现，请使用CSV或TXT格式'));
    });
  };

  /**
   * 触发文件选择对话框
   */
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  /**
   * 清除已选文件
   */
  const clearFile = () => {
    setFileName('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
      />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={loading}
            className="btn btn-primary btn-sm"
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                处理中...
              </>
            ) : (
              label
            )}
          </button>
          
          {fileName && (
            <div className="flex items-center gap-2 bg-base-200 px-3 py-1 rounded-md">
              <span className="text-sm truncate max-w-xs">{fileName}</span>
              <button
                type="button"
                onClick={clearFile}
                className="text-error hover:text-error-focus"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {error && (
          <div className="text-error text-sm">{error}</div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;